/**
 * BrowseShield E2E Scan Flow Tests
 *
 * Real Chrome + real extension + real backend + real pages.
 * No mocking — every layer is exercised end to end.
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { setupExtension, teardownExtension } from "./helpers/extension-loader.js";
import { loginViaPopup } from "./helpers/auth.js";
import {
  waitForAssessment,
  getServiceWorker,
  clearAssessments,
} from "./helpers/assessment-reader.js";

// ── Load test site configuration ──

const configPath = path.resolve(import.meta.dirname, "..", "config", "test-sites.yml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

// ── Shared state across all tests (serial execution, workers: 1) ──

let ctx;       // { context, extensionId, serviceWorker, tmpExtDir, tmpUserDataDir }
let sw;        // service worker reference (may be re-acquired)

// ── Setup / Teardown ──

test.beforeAll(async () => {
  ctx = await setupExtension();
  sw = ctx.serviceWorker;

  // Log in the test user through the real popup auth flow
  await loginViaPopup(ctx.context, ctx.extensionId);
});

test.afterAll(async () => {
  if (ctx) {
    await teardownExtension(ctx);
  }
});

// Re-acquire service worker before each test (Chrome may recycle it)
test.beforeEach(async () => {
  sw = await getServiceWorker(ctx.context);
});

// ── Helper: run a scan test on a single URL ──

async function scanAndAssert(url, site) {
  const page = await ctx.context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const timeoutMs = site.assertion_mode === "smoke" ? 45_000 : 30_000;
    const entry = await waitForAssessment(sw, page.url(), timeoutMs);

    // Attach full result for reporting
    test.info().annotations.push({
      type: "assessment",
      description: JSON.stringify({
        url,
        label: site.label,
        expected: site.expected_safety ?? "(smoke)",
        actual: entry.assessment?.safety,
        confidence: entry.assessment?.confidence,
        reasons: entry.assessment?.reasons,
        heuristic_score: entry.assessment?.heuristic_score,
        ml_score: entry.assessment?.ml_score,
        final_score: entry.assessment?.final_score,
        error: entry.error,
      }),
    });

    // Core assertion: we got a result
    expect(entry.error, `Scan error for ${url}`).toBeNull();
    expect(entry.assessment, `No assessment for ${url}`).toBeTruthy();

    if (site.assertion_mode === "exact") {
      expect(entry.assessment.safety).toBe(site.expected_safety);

      if (site.min_confidence != null) {
        expect(entry.assessment.confidence).toBeGreaterThanOrEqual(
          site.min_confidence,
        );
      }
    }

    // Smoke: verify valid shape regardless of assertion_mode
    expect(entry.assessment.safety).toMatch(/^(safe|suspicious|unsafe)$/);
    expect(entry.assessment.confidence).toBeGreaterThan(0);
    expect(entry.assessment.confidence).toBeLessThanOrEqual(100);

    return entry;
  } finally {
    await page.close();
  }
}

// ── Fixture Tests — deterministic assertions ──

test.describe("Fixture sites", () => {
  for (const site of config.fixtures.sites) {
    test(`${site.label}`, async () => {
      const url = `${config.fixtures.base_url}${site.path}`;
      await scanAndAssert(url, site);
    });
  }

  // IP-access fixtures (accessed via 127.0.0.1 to trigger has_ip_address)
  if (config.fixtures.ip_access_sites) {
    for (const site of config.fixtures.ip_access_sites) {
      test(`${site.label}`, async () => {
        await scanAndAssert(site.url, site);
      });
    }
  }
});

// ── Live Site Smoke Tests — loose assertions ──

test.describe("Live sites", () => {
  for (const site of config.live_sites) {
    test(`${site.label}`, async () => {
      await scanAndAssert(site.url, site);
    });
  }
});
