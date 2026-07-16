// lib/scan-asset.ts
//
// Shared scan logic used by both the manual check route
// (app/api/assets/[id]/check/route.ts) and the scheduled cron route
// (app/api/cron/scan-assets/route.ts). Keeping this in one place means
// a fix here patches both paths at once.

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { safeFetch, SsrfBlockedError } from "@/lib/ssrf-guard";
import { assessDefacementRisk } from "@/lib/llm-risk-scoring";
import type { Asset } from "@prisma/client";

function stripToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 20_000);
}

export async function scanAsset(asset: Asset) {
    let fetchResult;
    try {
        fetchResult = await safeFetch(asset.url);
    } catch (err) {
        if (err instanceof SsrfBlockedError) {
            return { error: `Blocked: ${err.message}` as const };
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
            rawContentSanitized: text,
        },
    });

    if (!lastSnapshot || lastSnapshot.contentHash === contentHash) {
        return { changed: false as const, snapshot: newSnapshot };
    }

    try {
        const assessment = await assessDefacementRisk(
            lastSnapshot.rawContentSanitized,
            text
        );
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
        return { changed: true as const, alert };
    } catch (err) {
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
        return { changed: true as const, alert, degraded: true };
    }
}