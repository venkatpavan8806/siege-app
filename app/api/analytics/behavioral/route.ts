// app/api/analytics/behavioral/route.ts
//
// GET returns behavioral analytics signals across the caller's assets
// (or all assets, for ADMIN) — patterns across scans/alerts over time,
// distinct from any single content diff.

import { NextResponse } from "next/server";
import { requireAuth, withAuthErrors } from "@/lib/rbac";
import { computeBehavioralSignals } from "@/lib/behavioral-analytics";

export const GET = withAuthErrors(async () => {
    const session = await requireAuth();

    const signals = await computeBehavioralSignals(
        session.role === "ADMIN" ? {} : { addedById: session.userId }
    );

    return NextResponse.json({ signals });
});