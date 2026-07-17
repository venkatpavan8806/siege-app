// app/api/assets/[id]/route.ts
//
// DELETE removes an asset and all its dependent records (snapshots,
// alerts, vuln findings) in a single transaction. AuditLog entries are
// NOT deleted — resourceId is a plain string, not a foreign key, so the
// audit trail for this asset survives its deletion by design (an
// append-only log should still show "who deleted what, when" after the
// fact).
//
// Same ownership pattern as every other asset-scoped route: 404 whether
// the asset doesn't exist or isn't yours, never split into 404 vs 403.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";

export const DELETE = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });

    if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
      throw new AuthError("Not found", 404);
    }

    // Delete child records first to satisfy foreign key constraints —
    // Alert references Snapshot, so Alert must go before Snapshot.
    await prisma.$transaction([
      prisma.alert.deleteMany({ where: { assetId: asset.id } }),
      prisma.vulnFinding.deleteMany({ where: { assetId: asset.id } }),
      prisma.snapshot.deleteMany({ where: { assetId: asset.id } }),
      prisma.asset.delete({ where: { id: asset.id } }),
    ]);

    await record({
      userId: session.userId,
      action: "ASSET_DELETE",
      resourceType: "Asset",
      resourceId: asset.id,
    });

    return NextResponse.json({ deleted: true });
  }
);