// app/api/assets/[id]/discover-pages/route.ts
//
// GET fetches the asset's URL (through the existing SSRF guard) and
// returns same-hostname page links found on it, for the user to review
// and optionally register. This route only discovers — it never
// creates Asset rows itself, so nothing gets auto-registered without
// explicit user selection (see DiscoverPagesButton.tsx, which posts to
// the normal POST /api/assets route per selected link).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { safeFetch, SsrfBlockedError } from "@/lib/ssrf-guard";
import { extractSameHostLinks } from "@/lib/extract-links";

export const GET = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
      throw new AuthError("Not found", 404);
    }

    let fetchResult;
    try {
      fetchResult = await safeFetch(asset.url);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        return NextResponse.json({ error: `Blocked: ${err.message}` }, { status: 400 });
      }
      throw err;
    }

    const links = extractSameHostLinks(fetchResult.body, asset.url);

    return NextResponse.json({ links });
  }
);