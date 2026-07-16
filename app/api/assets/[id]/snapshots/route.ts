// app/api/assets/[id]/snapshots/route.ts
//
// Returns recent snapshots for one asset, so a UI can render an old-vs-new
// comparison view. Read-only, ownership-scoped same as every other route.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";

export const GET = withAuthErrors(
    async (req: Request, { params }: { params: { id: string } }) => {
        const session = await requireAuth();

        const asset = await prisma.asset.findUnique({ where: { id: params.id } });

        // Same "Not found" whether the asset doesn't exist OR isn't this
        // user's — never split this into 404 vs 403. See app/api/assets/[id]/route.ts
        // for why: a split leaks which asset IDs exist and belong to
        // other users through the status code alone.
        if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
            throw new AuthError("Not found", 404);
        }

        const url = new URL(req.url);
        const limitParam = url.searchParams.get("limit");
        const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

        const snapshots = await prisma.snapshot.findMany({
            where: { assetId: asset.id },
            orderBy: { capturedAt: "desc" },
            take: limit,
            select: {
                id: true,
                contentHash: true,
                rawContentSanitized: true,
                capturedAt: true,
            },
        });

        return NextResponse.json({ snapshots });
    }
);