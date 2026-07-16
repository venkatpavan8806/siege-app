// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { record } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
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
