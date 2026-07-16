// app/api/assets/[id]/check/route.ts
//
// This is the core pipeline: fetch the asset's current content safely,
// diff it against the last snapshot, and if it changed meaningfully,
// classify the change with the LLM. This is the route an attacker will
// probe hardest — it's the intersection of SSRF, stored-XSS, and
// prompt-injection surface all at once.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { safeFetch, SsrfBlockedError } from "@/lib/ssrf-guard";
import { assessDefacementRisk } from "@/lib/llm-risk-scoring";
import { record } from "@/lib/audit";
import { allowRequest } from "@/lib/rate-limit";

// Extremely bare-bones HTML-to-text so we never store/diff/render raw
// markup. This is intentionally conservative — good enough to strip tags
// for a hackathon build, not a substitute for a real sanitizer if you
// extend this later.
function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000);
}

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

    // Same "Not found" whether the asset doesn't exist OR isn't this
    // user's — never split this into 404 vs 403. See app/api/assets/[id]/route.ts
    // for why: a split leaks which asset IDs exist and belong to other
    // users through the status code alone.
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

    const text = stripToText(fetchResult.body);
    const contentHash = crypto.createHash("sha256").update(text).digest("hex");

    const lastSnapshot = await prisma.snapshot.findFirst({
      where: { assetId: asset.id },
      orderBy: { capturedAt: "desc" },
    });

    const newSnapshot = await prisma.snapshot.create({
      data: {
        assetId: asset.id,
        contentHash,
        rawContentSanitized: text, // plain text only — see dashboard notes
      },
    });

    await record({
      userId: session.userId,
      action: "ASSET_CHECK",
      resourceType: "Asset",
      resourceId: asset.id,
    });

    if (!lastSnapshot || lastSnapshot.contentHash === contentHash) {
      // No baseline yet, or nothing changed — no alert needed.
      return NextResponse.json({ changed: false, snapshot: newSnapshot });
    }

    let assessment;
    try {
      assessment = await assessDefacementRisk(
        lastSnapshot.rawContentSanitized,
        text
      );
    } catch (err) {
      // Fail closed: create a review-needed alert rather than silently
      // dropping a real content change on the floor because the LLM call
      // errored.
      console.error("LLM risk scoring failed:", err);
      const alert = await prisma.alert.create({
        data: {
          assetId: asset.id,
          snapshotId: newSnapshot.id,
          diffSummary: "Content changed; automated risk scoring unavailable.",
          aiRiskScore: -1,
          aiExplanation: "Risk scoring failed — needs manual review.",
          recommendedAction: "Manually review this change — automated analysis failed.",
          severity: "MEDIUM",
        },
      });
      return NextResponse.json({ changed: true, alert, degraded: true });
    }

    const alert = await prisma.alert.create({
      data: {
        assetId: asset.id,
        snapshotId: newSnapshot.id,
        diffSummary: "Content changed since last check.",
        aiRiskScore: assessment.aiRiskScore,
        aiExplanation: assessment.aiExplanation,
        recommendedAction: assessment.recommendedAction,
        severity: assessment.severity,
      },
    });

    return NextResponse.json({ changed: true, alert });
  }
);
