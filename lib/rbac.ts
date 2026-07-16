// lib/rbac.ts
//
// Centralized authorization. Every API route that touches non-public data
// MUST call requireRole() (or requireAuth()) as its FIRST line, before any
// DB read/write. Doing this in one place — instead of scattering ad-hoc
// checks per route — means one fix here patches every route at once,
// which matters when the fix clock is 15 minutes.
//
// Rulebook SL-1 examples this directly defends against:
//   - "A non-admin user can access admin-only controls"
//   - "Protected records can be viewed without authorization"

import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "./auth";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Throws AuthError if there is no valid session. */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Not authenticated", 401);
  return session;
}

/**
 * Throws AuthError if there is no valid session, or the session's role
 * is not in `roles`. Use this instead of hiding a button in the UI —
 * UI hiding is not access control.
 */
export async function requireRole(
  roles: Array<"ADMIN" | "ANALYST">
): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    throw new AuthError("Forbidden: insufficient role", 403);
  }
  return session;
}

/**
 * Wrap a route handler with this so AuthError becomes a clean JSON
 * response instead of a stack trace leaking to the client.
 *
 * Usage:
 *   export const POST = withAuthErrors(async (req) => { ... });
 */
export function withAuthErrors<Context = unknown>(
  handler: (req: Request, context: Context) => Promise<Response>
) {
  return async (req: Request, context: Context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

/**
 * IMPORTANT: ownership checks are NOT covered by requireRole().
 * If a resource has an owner (e.g. Asset.addedById), fetch the resource
 * and compare it against session.userId server-side — never trust a
 * userId/ownerId supplied by the client in the request body.
 *
 * Example pattern for a resource-scoped route:
 *
 *   const session = await requireAuth();
 *   const asset = await prisma.asset.findUnique({ where: { id } });
 *   if (!asset) throw new AuthError("Not found", 404);
 *   if (session.role !== "ADMIN" && asset.addedById !== session.userId) {
 *     throw new AuthError("Forbidden", 403);
 *   }
 */
