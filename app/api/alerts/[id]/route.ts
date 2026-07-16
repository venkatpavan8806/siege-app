// app/api/alerts/[id]/route.ts
//
// PATCH updates an alert's status. ANALYST can ACKNOWLEDGE alerts on
// assets they own. Only ADMIN can mark an alert RESOLVED. Ownership for
// ACKNOWLEDGED is still checked through the alert's parent asset — same
// pattern as app/api/assets/[id]/check/route.ts. Never trust the id in
// the URL alone as proof of authorization.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";
import { allowAlertsWrite } from "@/lib/rate-limit";

const ALLOWED_STATUSES = ["ACKNOWLEDGED", "RESOLVED"] as const;

export const PATCH = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    if (!allowAlertsWrite(session.userId)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const status = body?.status;

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "status must be ACKNOWLEDGED or RESOLVED" },
        { status: 400 }
      );
    }

    // Only ADMIN may resolve. This check happens before the alert is even
    // fetched, so an ANALYST gets a clean 403 regardless of ownership.
    if (status === "RESOLVED" && session.role !== "ADMIN") {
      throw new AuthError("Forbidden: only ADMIN can resolve alerts", 403);
    }

    const alert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });

    // Same "Not found" whether the alert doesn't exist OR its parent
    // asset isn't this user's — never split this into 404 vs 403. See
    // app/api/assets/[id]/route.ts for why: a split leaks which alert
    // IDs exist and belong to other users through the status code alone.
    if (!alert || (session.role !== "ADMIN" && alert.asset.addedById !== session.userId)) {
      throw new AuthError("Not found", 404);
    }

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status },
    });

    await record({
      userId: session.userId,
      action: status === "RESOLVED" ? "ALERT_RESOLVED" : "ALERT_STATUS_UPDATE",
      resourceType: "Alert",
      resourceId: alert.id,
    });

    return NextResponse.json({ alert: updated });
  }
);
