// lib/extract-links.ts
//
// Extracts same-hostname page links from an already-fetched HTML body,
// for the "discover pages on this domain" feature. This only parses a
// string — it never performs its own network request. The HTML it
// operates on must already have come through lib/ssrf-guard.ts's
// safeFetch, same as every other content-handling path in this app.

const MAX_LINKS = 15;

export function extractSameHostLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const found = new Set<string>();

  const hrefRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null && found.size < MAX_LINKS * 4) {
    const raw = match[1].trim();

    // Skip anchors, mailto, tel, javascript pseudo-links.
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(raw, base);
    } catch {
      continue;
    }

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;
    if (resolved.hostname !== base.hostname) continue; // same host only

    resolved.hash = ""; // ignore fragment-only differences
    const normalized = resolved.toString();

    if (normalized !== base.toString()) {
      found.add(normalized);
    }
  }

  return Array.from(found).slice(0, MAX_LINKS);
}