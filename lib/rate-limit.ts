// lib/rate-limit.ts
//
// Basic in-memory rate limiter. Caps how many times a caller can hit an
// abusable action (login, asset creation, triggering an external fetch +
// LLM call) per window. In-memory means this resets on server restart and
// doesn't share state across multiple server instances — fine for a
// single-instance hackathon deploy, not a substitute for a real
// distributed rate limiter (e.g. Redis / Upstash) in production, since a
// multi-instance deploy gives each instance its own map and an attacker
// effectively gets N buckets instead of one.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Cheap, lazy prune so the map doesn't grow forever across a long-running
// process. Only sweeps every PRUNE_INTERVAL calls, not on every request.
const PRUNE_INTERVAL = 500;
let callsSinceLastPrune = 0;

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    // A generous fixed TTL for pruning purposes — any bucket idle this
    // long is definitely stale regardless of which config created it.
    if (now - bucket.windowStart > 30 * 60_000) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Length of the sliding window, in milliseconds. */
  windowMs: number;
  /** Max allowed hits per key within the window. */
  max: number;
}

/**
 * Core limiter. `namespacedKey` MUST already include a namespace prefix
 * (e.g. "login-ip:1.2.3.4") so different limiters using the same raw key
 * (like a userId used by both the check-asset limiter and the add-asset
 * limiter) don't share a bucket by accident.
 *
 * Returns true if the call is allowed, false if the caller has exceeded
 * `config.max` within the last `config.windowMs`.
 */
function checkLimit(namespacedKey: string, config: RateLimitConfig): boolean {
  const now = Date.now();

  callsSinceLastPrune += 1;
  if (callsSinceLastPrune >= PRUNE_INTERVAL) {
    callsSinceLastPrune = 0;
    pruneExpired(now);
  }

  const bucket = buckets.get(namespacedKey);

  if (!bucket || now - bucket.windowStart > config.windowMs) {
    buckets.set(namespacedKey, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= config.max) {
    return false;
  }

  bucket.count += 1;
  return true;
}

// ---------------------------------------------------------------------
// Asset-check limiter (Person B's original) — unchanged behavior/config,
// just rebuilt on the shared checkLimit() core. Keyed by userId.
// ---------------------------------------------------------------------
const CHECK_WINDOW_MS = 60_000;
const CHECK_MAX_PER_WINDOW = 5;

/**
 * Returns true if the request is allowed, false if the caller has
 * exceeded the check-endpoint limit within the last window.
 */
export function allowRequest(key: string): boolean {
  return checkLimit(`check:${key}`, {
    windowMs: CHECK_WINDOW_MS,
    max: CHECK_MAX_PER_WINDOW,
  });
}

// ---------------------------------------------------------------------
// Login limiter — two layers, because they defend against two different
// attackers:
//
//   1. Per-IP: stops one attacker from brute-forcing (or spraying
//      passwords across) many accounts from a single source.
//   2. Per-account (email): stops a *distributed* attacker (botnet /
//      rotating IPs / proxies) from brute-forcing one specific account,
//      since that attack never trips the per-IP limiter.
//
// Keyed by normalized email, not IP+email, precisely so IP rotation
// doesn't reset the account's counter.
// ---------------------------------------------------------------------
const LOGIN_IP_WINDOW_MS = 15 * 60_000;
const LOGIN_IP_MAX = 20;

const LOGIN_ACCOUNT_WINDOW_MS = 15 * 60_000;
const LOGIN_ACCOUNT_MAX = 5;

export function allowLoginByIp(ip: string): boolean {
  return checkLimit(`login-ip:${ip}`, {
    windowMs: LOGIN_IP_WINDOW_MS,
    max: LOGIN_IP_MAX,
  });
}

export function allowLoginByAccount(email: string): boolean {
  return checkLimit(`login-acct:${email}`, {
    windowMs: LOGIN_ACCOUNT_WINDOW_MS,
    max: LOGIN_ACCOUNT_MAX,
  });
}

// ---------------------------------------------------------------------
// Add-asset limiter — stops an authenticated user's session (or a
// credential-stuffed / compromised account) from mass-spamming the
// assets table. Keyed by userId, since this route requires auth.
// ---------------------------------------------------------------------
const ADD_ASSET_WINDOW_MS = 60_000;
const ADD_ASSET_MAX = 10;

export function allowAddAsset(userId: string): boolean {
  return checkLimit(`add-asset:${userId}`, {
    windowMs: ADD_ASSET_WINDOW_MS,
    max: ADD_ASSET_MAX,
  });
}

// ---------------------------------------------------------------------
// Logout limiter — logout itself isn't sensitive, but it still does a
// DB write (audit log) per authenticated call, so it's cheap insurance
// against a script hammering it. Keyed by userId when a session exists;
// callers fall back to IP for the (rare) unauthenticated case.
// ---------------------------------------------------------------------
const LOGOUT_WINDOW_MS = 60_000;
const LOGOUT_MAX = 10;

export function allowLogout(key: string): boolean {
  return checkLimit(`logout:${key}`, {
    windowMs: LOGOUT_WINDOW_MS,
    max: LOGOUT_MAX,
  });
}

// ---------------------------------------------------------------------
// Alerts limiters. Lower priority than login/add-asset/check — this
// endpoint is authenticated, DB-scoped to what the caller already owns,
// and never calls out to the network or an LLM — but still worth
// capping:
//   - read: mostly cost/DoS hygiene (repeated full-list queries).
//   - write (status update): the PATCH route returns different errors
//     for "exists, not yours" (403) vs "doesn't exist" (404), which is
//     an ID-enumeration side channel. Rate limiting doesn't close that
//     leak by itself, but it makes scripted enumeration impractically
//     slow, and caps audit-log write spam from repeated status flips.
// ---------------------------------------------------------------------
const ALERTS_READ_WINDOW_MS = 60_000;
const ALERTS_READ_MAX = 60;

const ALERTS_WRITE_WINDOW_MS = 60_000;
const ALERTS_WRITE_MAX = 20;

export function allowAlertsRead(userId: string): boolean {
  return checkLimit(`alerts-read:${userId}`, {
    windowMs: ALERTS_READ_WINDOW_MS,
    max: ALERTS_READ_MAX,
  });
}

export function allowAlertsWrite(userId: string): boolean {
  return checkLimit(`alerts-write:${userId}`, {
    windowMs: ALERTS_WRITE_WINDOW_MS,
    max: ALERTS_WRITE_MAX,
  });
}

// ---------------------------------------------------------------------
// Client IP extraction — needed for the login limiter, since there's no
// session yet to key off of. Vercel (and most proxies) set
// x-forwarded-for as a comma-separated list; the first entry is the
// original client. There's no way to cryptographically verify this
// header in general — a client could forge it directly against an
// origin that trusts it blindly — but behind Vercel's edge network the
// value is set by Vercel itself rather than passed through from the
// client unmodified, so it's trustworthy in that deployment context.
// ---------------------------------------------------------------------
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // No proxy headers (e.g. local dev without one) — fall back to a
  // constant key rather than throwing. This means local requests share
  // one bucket, which is fine outside of a real deployment.
  return "unknown";
}