// app/api/assets/[id]/scan-toggle/route.ts
//
// PATCH toggles whether an asset is included in scheduled scans.
// Same ownership pattern as check/route.ts and route.ts (DELETE):
// 404 whether the asset doesn't exist or isn't yours — never split
// into 404 vs 403.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";

export const PATCH = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    const body = await req.json().catch(() => null);
    const scanEnabled = body?.scanEnabled;

    if (typeof scanEnabled !== "boolean") {
      return NextResponse.json(
        { error: "scanEnabled must be true or false" },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });

    if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
      throw new AuthError("Not found", 404);
    }

    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { scanEnabled },
    });

    await record({
      userId: session.userId,
      action: scanEnabled ? "SCAN_ENABLED" : "SCAN_DISABLED",
      resourceType: "Asset",
      resourceId: asset.id,
    });

    return NextResponse.json({ asset: updated });
  }
);
