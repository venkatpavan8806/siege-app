// app/api/cron/scan-assets/route.ts
//
// Called on a schedule by Vercel Cron (see vercel.json). Scans every
// asset with scanEnabled: true. Protected by CRON_SECRET so this
// endpoint can't be triggered by an outside caller.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanAsset } from "@/lib/scan-asset";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assets = await prisma.asset.findMany({ where: { scanEnabled: true } });

    const results = [];
    for (const asset of assets) {
        try {
            const result = await scanAsset(asset);
            results.push({ assetId: asset.id, ...result });
        } catch (err) {
            console.error(`Scheduled scan failed for asset ${asset.id}:`, err);
            results.push({ assetId: asset.id, error: "scan_failed" });
        }
    }

    return NextResponse.json({ scanned: results.length, results });
}