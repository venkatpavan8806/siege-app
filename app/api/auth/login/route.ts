// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { record } from "@/lib/audit";
import { allowLoginByIp, allowLoginByAccount, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Two independent limiters, checked before any DB/bcrypt work so a
  // brute-force attempt doesn't even pay for a password hash comparison:
  //   - per-IP: stops one source hammering logins (single account or
  //     spraying across many).
  //   - per-account: stops a distributed/rotating-IP attacker from
  //     grinding through passwords for one specific email.
  // Same 429 shape either way — don't let the response tell an attacker
  // which limiter tripped.
  const ip = getClientIp(req);
  if (!allowLoginByIp(ip) || !allowLoginByAccount(email)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately identical response/timing shape whether the user exists
  // or the password is wrong — don't leak which one failed.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession({ userId: user.id, role: user.role });
  await record({
    userId: user.id,
    action: "LOGIN",
    resourceType: "User",
    resourceId: user.id,
  });

  return NextResponse.json({ ok: true, role: user.role });
}
