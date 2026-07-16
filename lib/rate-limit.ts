// lib/rate-limit.ts
//
// Basic in-memory rate limiter. Caps how many times a user can hit an
// expensive/abusable action (like triggering an external fetch + LLM
// call) per minute. In-memory means this resets on server restart and
// doesn't share state across multiple server instances — fine for a
// single-instance hackathon deploy, not a substitute for a real
// distributed rate limiter (e.g. Redis) in production.

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the request is allowed, false if the caller has
 * exceeded MAX_REQUESTS_PER_WINDOW within the last WINDOW_MS.
 */
export function allowRequest(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  bucket.count += 1;
  return true;
}