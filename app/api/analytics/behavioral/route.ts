// app/api/analytics/behavioral/route.ts
//
// GET returns behavioral analytics signals across the caller's assets
// (or all assets, for ADMIN) — patterns across scans/alerts over time,
// distinct from any single content diff. Also returns an LLM-synthesized
// summary + prioritized action across all signals together, when the
// synthesis call succeeds (it's a soft-fail enhancement, not required
// for the raw signals to be useful on their own).

import { NextResponse } from "next/server";
import { requireAuth, withAuthErrors } from "@/lib/rbac";
import { computeBehavioralSignals } from "@/lib/behavioral-analytics";
import { synthesizeBehavioralSignals } from "@/lib/behavioral-synthesis";

export const GET = withAuthErrors(async () => {
  const session = await requireAuth();
  const signals = await computeBehavioralSignals(
    session.role === "ADMIN" ? {} : { addedById: session.userId }
  );

  const synthesis = await synthesizeBehavioralSignals(signals);

  return NextResponse.json({ signals, synthesis });
});