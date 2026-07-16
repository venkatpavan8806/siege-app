// app/api/assets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";

// GET /api/assets — ADMIN sees all assets, ANALYST sees only their own.
// This is the "protected records can't be viewed without authorization"
// SL-1 case: the scoping happens in the DB query, not by filtering a
// full list client-side.
export const GET = withAuthErrors(async () => {
  const session = await requireAuth();

  const assets = await prisma.asset.findMany({
    where: session.role === "ADMIN" ? {} : { addedById: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assets });
});

// POST /api/assets — any authenticated user can register an asset to monitor.
export const POST = withAuthErrors(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json().catch(() => null);

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";

  if (!url || !name) {
    return NextResponse.json({ error: "url and name are required" }, { status: 400 });
  }

  // Validate the URL shape here; the actual SSRF-safe resolution happens
  // at fetch-time in lib/ssrf-guard.ts, not here — a URL can be "valid"
  // now and still need per-fetch DNS re-validation (rebinding).
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("bad scheme");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: { url, name, addedById: session.userId },
  });

  await record({
    userId: session.userId,
    action: "ASSET_CREATE",
    resourceType: "Asset",
    resourceId: asset.id,
  });

  return NextResponse.json({ asset }, { status: 201 });
});
