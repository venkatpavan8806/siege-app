// lib/ssrf-guard.ts
//
// This platform's core feature is "fetch a URL the user gives us." That is
// an SSRF vector by construction — attackers will try things like
// http://169.254.169.254/latest/meta-data (cloud metadata), http://localhost:PORT,
// http://127.0.0.1, internal hostnames, or DNS-rebinding (a domain that
// resolves to a public IP at check-time but a private IP at fetch-time).
//
// Rules enforced here:
//   1. Only http/https schemes.
//   2. Resolve DNS ourselves and validate the resolved IP — not the hostname —
//      against a private/reserved-range blocklist.
//   3. Disable automatic redirect-following; validate each redirect hop
//      manually so a public URL can't 302 you into a private one.
//   4. Hard timeout + response size cap so a slow/huge target can't be used
//      to tie up server resources.
//
// Anything fetched through here is untrusted content. Callers must treat
// the response body as data, never as HTML to render or as instructions
// to an LLM (see lib/llm-risk-scoring.ts).

import dns from "node:dns/promises";
import net from "node:net";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 2_000_000; // 2MB
const MAX_REDIRECTS = 3;

class SsrfBlockedError extends Error {}

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 0) return true; // "this network"
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("fe80")) return true; // link-local
    return false;
  }
  return true; // couldn't parse -> treat as unsafe
}

async function resolveAndValidate(hostname: string): Promise<void> {
  // If the hostname is already a literal IP, validate it directly.
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SsrfBlockedError(`Blocked target IP: ${hostname}`);
    }
    return;
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new SsrfBlockedError(`DNS resolution failed for ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new SsrfBlockedError(`No addresses resolved for ${hostname}`);
  }

  // Block if ANY resolved address is private — a hostname that resolves to
  // both a public and a private IP is exactly the DNS-rebinding pattern.
  for (const addr of addresses) {
    if (isPrivateOrReservedIp(addr)) {
      throw new SsrfBlockedError(
        `Blocked: ${hostname} resolves to reserved/private IP ${addr}`
      );
    }
  }
}

export type SafeFetchResult = {
  finalUrl: string;
  status: number;
  body: string; // raw text, capped at MAX_BODY_BYTES — treat as untrusted
};

/**
 * Fetch a user-supplied URL safely for asset monitoring.
 * Throws SsrfBlockedError (safe to catch and surface as a 400 to the user)
 * on any policy violation.
 */
export async function safeFetch(inputUrl: string): Promise<SafeFetchResult> {
  let currentUrl = inputUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(currentUrl); // throws on malformed input

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SsrfBlockedError(`Blocked scheme: ${parsed.protocol}`);
    }

    await resolveAndValidate(parsed.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        redirect: "manual", // we validate each hop ourselves
        signal: controller.signal,
        headers: { "User-Agent": "SiegeAssetMonitor/1.0" },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new SsrfBlockedError(
          `Request timed out after ${FETCH_TIMEOUT_MS}ms`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new SsrfBlockedError("Redirect with no Location header");
      currentUrl = new URL(location, parsed).toString();
      continue; // loop re-validates the new hop's DNS/IP before following it
    }

    // Enforce size cap while reading, don't just check Content-Length
    // (which the server can lie about).
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
          throw new SsrfBlockedError("Response exceeded max body size");
        }
        chunks.push(value);
      }
    }
    const body = Buffer.concat(chunks).toString("utf-8");

    return { finalUrl: currentUrl, status: res.status, body };
  }

  throw new SsrfBlockedError("Too many redirects");
}

export { SsrfBlockedError };
