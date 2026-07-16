// app/api/alerts/[id]/route.ts
//
// PATCH updates an alert's status (ACKNOWLEDGED or RESOLVED). Ownership
// is checked through the alert's parent asset — same pattern as
// app/api/assets/[id]/check/route.ts. Never trust the id in the URL
// alone as proof of authorization.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError, withAuthErrors } from "@/lib/rbac";
import { record } from "@/lib/audit";

const ALLOWED_STATUSES = ["ACKNOWLEDGED", "RESOLVED"] as const;

export const PATCH = withAuthErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireAuth();

    const body = await req.json().catch(() => null);
    const status = body?.status;

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "status must be ACKNOWLEDGED or RESOLVED" },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });
    if (!alert) throw new AuthError("Not found", 404);

    // Ownership check via the parent asset, same as the check route.
    if (session.role !== "ADMIN" && alert.asset.addedById !== session.userId) {
      throw new AuthError("Forbidden", 403);
    }

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status },
    });

    await record({
      userId: session.userId,
      action: "ALERT_STATUS_UPDATE",
      resourceType: "Alert",
      resourceId: alert.id,
    });

    return NextResponse.json({ alert: updated });
  }
);