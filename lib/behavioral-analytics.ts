// lib/behavioral-analytics.ts
//
// Behavioral analytics beyond single-snapshot content diffing: looks at
// patterns across an asset's (or a user's whole portfolio's) history —
// scan cadence, and clustering of high-severity alerts across assets in
// a short window, which single-alert content diffing can't surface.

import { prisma } from "@/lib/db";

export type BehavioralSignal = {
    type: "SCAN_GAP" | "ALERT_CLUSTER" | "RISING_RISK_TREND";
    message: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
};

const CLUSTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CLUSTER_THRESHOLD = 2; // 2+ HIGH severity alerts across assets in the window

export async function computeBehavioralSignals(
    ownerFilter: { addedById?: string } // {} for ADMIN (all assets)
): Promise<BehavioralSignal[]> {
    const signals: BehavioralSignal[] = [];

    const assets = await prisma.asset.findMany({
        where: ownerFilter,
        include: {
            snapshots: { orderBy: { capturedAt: "desc" }, take: 5 },
            alerts: { orderBy: { createdAt: "desc" }, take: 10 },
        },
    });

    // Signal 1: scan gaps — an enabled asset that hasn't been checked recently
    for (const asset of assets) {
        if (!asset.scanEnabled) continue;
        const last = asset.snapshots[0];
        if (!last) continue;
        const hoursSinceLastScan =
            (Date.now() - last.capturedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastScan > 6) {
            signals.push({
                type: "SCAN_GAP",
                message: `"${asset.name}" has auto-scan enabled but hasn't been checked in ${Math.round(
                    hoursSinceLastScan
                )}h — cron may be misconfigured or the target may be unreachable.`,
                severity: "MEDIUM",
            });
        }
    }

    // Signal 2: cross-asset clustering of HIGH severity alerts in a short
    // window — a pattern a single content diff can never show, since it
    // only makes sense looking across multiple assets/alerts together.
    const recentHighAlerts = assets
        .flatMap((a) => a.alerts.map((al) => ({ ...al, assetName: a.name })))
        .filter(
            (al) =>
                al.severity === "HIGH" &&
                Date.now() - al.createdAt.getTime() < CLUSTER_WINDOW_MS
        );

    if (recentHighAlerts.length >= CLUSTER_THRESHOLD) {
        const assetNames = [...new Set(recentHighAlerts.map((a) => a.assetName))];
        signals.push({
            type: "ALERT_CLUSTER",
            message: `${recentHighAlerts.length} HIGH severity alerts across ${assetNames.length} asset(s) in the last hour (${assetNames.join(
                ", "
            )}) — possible coordinated attack rather than isolated incidents.`,
            severity: "HIGH",
        });
    }

    // Signal 3: rising risk trend per asset — average aiRiskScore trending
    // up across recent alerts, even if none individually crossed HIGH yet.
    for (const asset of assets) {
        const scored = asset.alerts.filter((a) => a.aiRiskScore >= 0);
        if (scored.length < 3) continue;
        const half = Math.floor(scored.length / 2);
        const older = scored.slice(half);
        const newer = scored.slice(0, half);
        const avg = (arr: typeof scored) =>
            arr.reduce((s, a) => s + a.aiRiskScore, 0) / arr.length;
        const olderAvg = avg(older);
        const newerAvg = avg(newer);
        if (newerAvg - olderAvg >= 15) {
            signals.push({
                type: "RISING_RISK_TREND",
                message: `"${asset.name}" shows a rising risk trend (avg score ${Math.round(
                    olderAvg
                )} → ${Math.round(newerAvg)}) across recent checks — worth manual review even without a single HIGH alert.`,
                severity: "MEDIUM",
            });
        }
    }

    return signals;
}