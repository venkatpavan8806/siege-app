// app/api/assets/[id]/vuln-scan/route.ts
//
// POST triggers a traditional-sense vulnerability scan (headers,
// transport, exposure, info disclosure) against an asset's URL and
// stores each finding. Ownership check follows the same pattern as
// check/route.ts — 404 whether the asset doesn't exist or isn't yours.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";
import { allowRequest } from "@/lib/rate-limit";
import { runVulnScan } from "@/lib/vuln-scan";

export const POST = withAuthErrors(
    async (req: Request, { params }: { params: { id: string } }) => {
        const session = await requireAuth();

        if (!allowRequest(session.userId)) {
            return NextResponse.json(
                { error: "Too many scans. Please wait a minute and try again." },
                { status: 429 }
            );
        }

        const asset = await prisma.asset.findUnique({ where: { id: params.id } });

        if (!asset || (session.role !== "ADMIN" && asset.addedById !== session.userId)) {
            throw new AuthError("Not found", 404);
        }

        const findings = await runVulnScan(asset.url);

        const created = await prisma.$transaction(
            findings.map((f) =>
                prisma.vulnFinding.create({
                    data: {
                        assetId: asset.id,
                        category: f.category,
                        finding: f.finding,
                        severity: f.severity,
                    },
                })
            )
        );

        await record({
            userId: session.userId,
            action: "VULN_SCAN",
            resourceType: "Asset",
            resourceId: asset.id,
        });

        return NextResponse.json({ findings: created });
    }
);