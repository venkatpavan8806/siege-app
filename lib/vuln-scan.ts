// lib/vuln-scan.ts
//
// Traditional-sense vulnerability scanning for a registered asset:
// missing security headers, weak transport, information disclosure via
// banners, and commonly-exposed sensitive paths. Every request here goes
// through safeFetch, so SSRF protections (private-IP blocking, DNS
// re-validation on redirects, size/time caps) apply uniformly — this
// module adds no new fetch primitive of its own.

import { safeFetch, SsrfBlockedError } from "@/lib/ssrf-guard";

export type VulnFindingResult = {
    category: "HEADERS" | "TRANSPORT" | "EXPOSURE" | "INFO_DISCLOSURE";
    finding: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
};

const SECURITY_HEADERS: Array<{
    header: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    advice: string;
}> = [
        { header: "content-security-policy", severity: "MEDIUM", advice: "Missing Content-Security-Policy header — increases stored/reflected XSS impact." },
        { header: "x-frame-options", severity: "MEDIUM", advice: "Missing X-Frame-Options header — site can be embedded in a clickjacking iframe." },
        { header: "x-content-type-options", severity: "LOW", advice: "Missing X-Content-Type-Options: nosniff — browsers may MIME-sniff responses." },
        { header: "strict-transport-security", severity: "MEDIUM", advice: "Missing Strict-Transport-Security header — HTTPS downgrade/stripping is possible." },
        { header: "referrer-policy", severity: "LOW", advice: "Missing Referrer-Policy header — full URLs may leak to third parties via Referer." },
    ];

// A conservative, low-noise set. Each one is a single extra safeFetch call
// (SSRF-guarded), so keep this list small to bound scan latency/cost.
const EXPOSED_PATH_CHECKS: Array<{ path: string; label: string }> = [
    { path: "/.env", label: ".env file" },
    { path: "/.git/config", label: ".git/config" },
    { path: "/wp-config.php.bak", label: "wp-config.php.bak" },
];

const SERVER_BANNER_HEADERS = ["server", "x-powered-by"];

export async function runVulnScan(url: string): Promise<VulnFindingResult[]> {
    const findings: VulnFindingResult[] = [];

    let result;
    try {
        result = await safeFetch(url);
    } catch (err) {
        if (err instanceof SsrfBlockedError) {
            findings.push({
                category: "EXPOSURE",
                finding: `Could not scan: ${err.message}`,
                severity: "LOW",
            });
            return findings;
        }
        throw err;
    }

    // 1. Transport check
    if (new URL(result.finalUrl).protocol !== "https:") {
        findings.push({
            category: "TRANSPORT",
            finding: "Site is served over plain HTTP, not HTTPS — traffic is unencrypted and interceptable.",
            severity: "HIGH",
        });
    }

    // 2. Missing security headers
    for (const check of SECURITY_HEADERS) {
        if (!result.headers[check.header]) {
            findings.push({
                category: "HEADERS",
                finding: check.advice,
                severity: check.severity,
            });
        }
    }

    // 3. Information disclosure via banners
    for (const bannerHeader of SERVER_BANNER_HEADERS) {
        const value = result.headers[bannerHeader];
        if (value) {
            findings.push({
                category: "INFO_DISCLOSURE",
                finding: `${bannerHeader} header discloses: "${value}" — consider suppressing version/framework details.`,
                severity: "LOW",
            });
        }
    }

    // 4. Commonly-exposed sensitive paths
    for (const check of EXPOSED_PATH_CHECKS) {
        try {
            const pathUrl = new URL(check.path, result.finalUrl).toString();
            const pathResult = await safeFetch(pathUrl);
            if (pathResult.status === 200 && pathResult.body.trim().length > 0) {
                findings.push({
                    category: "EXPOSURE",
                    finding: `Potentially exposed sensitive file: ${check.label} returned HTTP 200.`,
                    severity: "HIGH",
                });
            }
        } catch {
            // SSRF block or fetch error on a sub-path — not itself a finding,
            // just skip it silently rather than fail the whole scan.
        }
    }

    return findings;
}