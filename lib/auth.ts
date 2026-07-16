// lib/auth.ts
//
// Password hashing + session issuance/verification.
// Sessions are signed, httpOnly, secure cookies — NOT localStorage/JWT-in-JS,
// so a stored-XSS bug (see ssrf-guard.ts notes) can't be trivially escalated
// into session theft.

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "siege_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h — long enough for one event day

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fail loud at startup, not silently with a weak/default secret.
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a 32+ char random value in .env"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "ANALYST";
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" }) // algorithm pinned server-side —
    // never read alg from the incoming token, which is how "alg: none"
    // bypasses happen.
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Returns the verified session payload or null.
 * ALWAYS call this server-side before trusting a request's identity.
 * Never trust a userId/role passed in the request body or query string.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"], // explicit allow-list, matches what we signed with
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null; // expired, tampered, or malformed — treat identically
  }
}
