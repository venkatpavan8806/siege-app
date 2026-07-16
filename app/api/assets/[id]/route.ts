// app/api/assets/[id]/route.ts
//
// DELETE /api/assets/[id] — permanently removes an asset and all its
// dependent records (snapshots, alerts). Ownership is checked server-side
// against the DB, same pattern as the check route — never trust the
// URL id alone as proof of authorization.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";

export const DELETE = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!asset) throw new AuthError("Not found", 404);

    // Ownership check — an ANALYST can only delete assets they added,
    // ADMIN can delete any.
    if (session.role !== "ADMIN" && asset.addedById !== session.userId) {
      throw new AuthError("Forbidden", 403);
    }

    // Delete dependent records first, in one transaction, so we never
    // end up with orphaned alerts/snapshots or a half-deleted asset.
    await prisma.$transaction([
      prisma.alert.deleteMany({ where: { assetId: asset.id } }),
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