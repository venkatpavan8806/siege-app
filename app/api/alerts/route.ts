// app/api/alerts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, withAuthErrors } from "@/lib/rbac";
import { allowAlertsRead } from "@/lib/rate-limit";

// GET /api/alerts — ADMIN sees all alerts, ANALYST sees only alerts on
// assets they own. Same SL-1 pattern as app/api/assets/route.ts: the
// scoping happens in the DB query via a relation filter, not by
// filtering a full list client-side.
export const GET = withAuthErrors(async () => {
  const session = await requireAuth();

  if (!allowAlertsRead(session.userId)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const alerts = await prisma.alert.findMany({
    where:
      session.role === "ADMIN"
        ? {}
        : { asset: { addedById: session.userId } },
    include: {
      asset: {
        select: { id: true, name: true, url: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ alerts });
});