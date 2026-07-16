// app/api/assets/[id]/check/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";
import { allowRequest } from "@/lib/rate-limit";
import { scanAsset } from "@/lib/scan-asset";

export const POST = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    if (!allowRequest(session.userId)) {
      return NextResponse.json(
        { error: "Too many checks. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });

    if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
      throw new AuthError("Not found", 404);
    }

    const result = await scanAsset(asset);

    await record({
      userId: session.userId,
      action: "ASSET_CHECK",
      resourceType: "Asset",
      resourceId: asset.id,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }
);