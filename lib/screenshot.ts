// lib/screenshot.ts
//
// Captures a full-page PNG screenshot of a user-supplied asset URL using
// headless Chromium (Playwright), for local dev use only — screenshots
// are saved to public/snapshots/ on disk and served as static files by
// Next.js. Not suitable for Vercel/serverless deployment (ephemeral
// filesystem, no bundled Chromium) without further changes.
//
// SSRF: the initial URL is validated before Chromium ever navigates to
// it (same DNS/IP allowlist as safeFetch in lib/ssrf-guard.ts). We also
// intercept every top-level document navigation (including redirects)
// and re-validate the target host before letting Chromium follow it —
// this closes the redirect-to-internal-IP gap that a screenshot tool is
// otherwise exposed to, since Chromium follows redirects itself instead
// of going through safeFetch's manual redirect loop.

import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { assertUrlIsSafe } from "@/lib/ssrf-guard";

const SCREENSHOT_DIR = path.join(process.cwd(), "public", "snapshots");
const NAV_TIMEOUT_MS = 15_000;

/**
 * Navigates to `url` in headless Chromium and saves a full-page PNG to
 * public/snapshots/. Returns the public-relative path to store on the
 * Snapshot record (e.g. "/snapshots/abc123-1710000000000.png").
 *
 * Throws on SSRF-blocked URLs or navigation failure — callers should
 * treat screenshot capture as a soft-fail enhancement (catch and log,
 * don't let it break the underlying content check).
 */
export async function captureScreenshot(
  assetId: string,
  url: string
): Promise<string> {
  await assertUrlIsSafe(url);

  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "SiegeAssetMonitor/1.0",
    });

    // Re-validate every top-level navigation (initial load + any
    // redirects Chromium follows) before letting it through.
    await context.route("**/*", async (route) => {
      const req = route.request();
      if (req.resourceType() !== "document") {
        return route.continue();
      }
      try {
        await assertUrlIsSafe(req.url());
        return route.continue();
      } catch {
        return route.abort();
      }
    });

    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: NAV_TIMEOUT_MS,
    });

    if (!response || !response.ok()) {
      throw new Error(
        `Navigation failed or blocked (status: ${response?.status()})`
      );
    }

    const filename = `${assetId}-${Date.now()}.png`;
    const filePath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: true });

    return `/snapshots/${filename}`;
  } finally {
    await browser.close();
  }
}