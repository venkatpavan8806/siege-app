// lib/audit.ts
//
// Append-only audit trail. Deliberately exposes only `record()` — no
// update or delete function exists in this module on purpose. Do not add
// one; if you need to "fix" a bad log entry, write a new correcting entry
// instead. An audit log with an update/delete path is not tamper-evident,
// and "tamper-evident audit trail" is explicitly what this PS promises.

import { prisma } from "./db";

export async function record(params: {
  userId: string;
  action: string; // e.g. "ASSET_CREATE", "ALERT_ACK", "LOGIN"
  resourceType: string; // e.g. "Asset", "Alert"
  resourceId: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    },
  });
}
