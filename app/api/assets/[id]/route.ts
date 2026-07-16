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

    // Same "Not found" whether the asset doesn't exist OR it exists but
    // isn't this user's (ANALYST) — never split this into 404 vs 403.
    // A split lets someone enumerate which asset IDs exist and belong to
    // other users just from the status code, even though they could
    // never read the asset itself.
    if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
      throw new AuthError("Not found", 404);
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