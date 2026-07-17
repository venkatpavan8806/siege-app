// lib/scan-asset.ts
//
// Shared scan logic used by both the manual check route
// (app/api/assets/[id]/check/route.ts) and the scheduled cron route
// (app/api/cron/scan-assets/route.ts). Keeping this in one place means
// a fix here patches both paths at once.
//
// Scanning now covers the base asset URL AND any same-hostname subpages
// discovered by linking off the base page's HTML. Each page (base or
// subpage) is tracked independently via `sourceUrl` on Snapshot/Alert so
// diff comparisons never mix content from two different pages together.

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { safeFetch, SsrfBlockedError } from "@/lib/ssrf-guard";
import { assessDefacementRisk } from "@/lib/llm-risk-scoring";
import { captureScreenshot } from "@/lib/screenshot";
import { extractSameHostLinks } from "@/lib/extract-links";
import type { Asset } from "@prisma/client";

const MAX_SUBPAGES = 5;

function stripToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 20_000);
}

type PageScanResult =
    | { error: string }
    | { changed: false; snapshot: Awaited<ReturnType<typeof prisma.snapshot.create>> }
    | {
          changed: true;
          snapshot: Awaited<ReturnType<typeof prisma.snapshot.create>>;
          alert: Awaited<ReturnType<typeof prisma.alert.create>>;
          degraded?: boolean;
      };

// Scans a single URL (base or subpage) and stores its snapshot/alert
// tagged with sourceUrl so it's compared only against its own history.
async function scanSinglePage(
    assetId: string,
    url: string,
    sourceUrl: string | null
): Promise<PageScanResult & { html?: string }> {
    let fetchResult;
    try {
        fetchResult = await safeFetch(url);
    } catch (err) {
        if (err instanceof SsrfBlockedError) {
            return { error: `Blocked: ${err.message}` };
        }
        throw err;
    }

    const text = stripToText(fetchResult.body);
    const contentHash = crypto.createHash("sha256").update(text).digest("hex");

    const lastSnapshot = await prisma.snapshot.findFirst({
        where: { assetId, sourceUrl },
        orderBy: { capturedAt: "desc" },
    });

    const newSnapshot = await prisma.snapshot.create({
        data: {
            assetId,
            sourceUrl,
            contentHash,
            rawContentSanitized: text,
        },
    });

    // Screenshot capture is a soft-fail enhancement — if it errors (site
    // blocks headless browsers, times out, etc.) the content-based check
    // above has already succeeded and shouldn't be thrown away over it.
    try {
        const screenshotPath = await captureScreenshot(newSnapshot.id, url);
        await prisma.snapshot.update({
            where: { id: newSnapshot.id },
            data: { screenshotPath },
        });
        newSnapshot.screenshotPath = screenshotPath;
    } catch (err) {
        console.error(`Screenshot capture failed for ${url}:`, err);
    }

    if (!lastSnapshot || lastSnapshot.contentHash === contentHash) {
        return { changed: false, snapshot: newSnapshot, html: fetchResult.body };
    }

    try {
        const assessment = await assessDefacementRisk(
            lastSnapshot.rawContentSanitized,
            text
        );
        const alert = await prisma.alert.create({
            data: {
                assetId,
                sourceUrl,
                snapshotId: newSnapshot.id,
                diffSummary: sourceUrl
                    ? `Content changed since last check (subpage: ${sourceUrl}).`
                    : "Content changed since last check.",
                aiRiskScore: assessment.aiRiskScore,
                aiExplanation: assessment.aiExplanation,
                recommendedAction: assessment.recommendedAction,
                severity: assessment.severity,
            },
        });
        return { changed: true, snapshot: newSnapshot, alert, html: fetchResult.body };
    } catch (err) {
        console.error(`LLM risk scoring failed for ${url}:`, err);
        const alert = await prisma.alert.create({
            data: {
                assetId,
                sourceUrl,
                snapshotId: newSnapshot.id,
                diffSummary: "Content changed; automated risk scoring unavailable.",
                aiRiskScore: -1,
                aiExplanation: "Risk scoring failed — needs manual review.",
                recommendedAction: "Manually review this change — automated analysis failed.",
                severity: "MEDIUM",
            },
        });
        return {
            changed: true,
            snapshot: newSnapshot,
            alert,
            degraded: true,
            html: fetchResult.body,
        };
    }
}

export async function scanAsset(asset: Asset) {
    // 1. Scan the base asset URL exactly as before.
    const baseResult = await scanSinglePage(asset.id, asset.url, null);

    if ("error" in baseResult) {
        return { error: baseResult.error };
    }

    // 2. Discover same-hostname subpages from the base page's HTML and
    // scan each one independently. A subpage failing shouldn't take
    // down the whole scan — errors are collected, not thrown.
    const subpages: Array<{ url: string; result: PageScanResult }> = [];

    if (baseResult.html) {
        let links: string[] = [];
        try {
            links = extractSameHostLinks(baseResult.html, asset.url).slice(0, MAX_SUBPAGES);
        } catch (err) {
            console.error("Link extraction failed:", err);
        }

        for (const link of links) {
            try {
                const result = await scanSinglePage(asset.id, link, link);
                subpages.push({ url: link, result });
            } catch (err) {
                console.error(`Subpage scan failed for ${link}:`, err);
                subpages.push({
                    url: link,
                    result: { error: err instanceof Error ? err.message : "Unknown error" },
                });
            }
        }
    }

    const { html: _omit, ...baseWithoutHtml } = baseResult;
    return { ...baseWithoutHtml, subpages };
}