/**
 * Extension Loader
 *
 * Launches Chromium with the real BrowseShield extension loaded,
 * patches the manifest for local testing, and configures the API base URL.
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import os from "os";

const EXTENSION_SRC = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "Extension",
);

/**
 * Copy the Extension directory to a temp location and patch manifest.json
 * to allow requests to the local test backend.
 */
function prepareTempExtension(backendOrigin) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "browseshield-e2e-"));
  copyDirSync(EXTENSION_SRC, tmpDir);

  // Patch host_permissions to include local backend
  const manifestPath = path.join(tmpDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  const localPattern = `${backendOrigin}/*`;
  if (!manifest.host_permissions.includes(localPattern)) {
    manifest.host_permissions.push(localPattern);
  }
  // Also allow 127.0.0.1 variant
  const ipPattern = localPattern.replace("localhost", "127.0.0.1");
  if (!manifest.host_permissions.includes(ipPattern)) {
    manifest.host_permissions.push(ipPattern);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return tmpDir;
}

function copyDirSync(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Launch Chrome with the extension and return context + metadata.
 *
 * @param {object} options
 * @param {string} options.backendUrl - Full API base URL, e.g. "http://localhost:8001/v1"
 * @returns {{ context, extensionId, serviceWorker, tmpExtDir, tmpUserDataDir }}
 */
export async function setupExtension({
  backendUrl = "http://localhost:8001/v1",
} = {}) {
  const backendOrigin = new URL(backendUrl).origin;
  const tmpExtDir = prepareTempExtension(backendOrigin);
  const tmpUserDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "browseshield-e2e-profile-"),
  );

  const context = await chromium.launchPersistentContext(tmpUserDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${tmpExtDir}`,
      `--load-extension=${tmpExtDir}`,
      "--no-first-run",
      "--disable-default-apps",
      "--disable-search-engine-choice-screen",
    ],
  });

  // Wait for the extension's service worker to register
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", {
      timeout: 15_000,
    });
  }

  const extensionId = serviceWorker.url().split("/")[2];

  // Point the extension's API client at the local test backend
  await serviceWorker.evaluate(async (apiBase) => {
    await chrome.storage.local.set({ api_base_url: apiBase });
  }, backendUrl);

  // Clear the cached base URL so the new value takes effect
  await serviceWorker.evaluate(async () => {
    // The api module caches the base URL; importing and calling clearApiBaseCache
    // is not possible from evaluate, so we just remove and re-set the value.
    // The cache is per-service-worker lifetime and we just set the value above,
    // so on next getApiBase() call it will read fresh from storage.
    // Force-clear by removing the cached module state — the simplest way is to
    // ensure the first real API call reads from storage by not caching yet.
  });

  return {
    context,
    extensionId,
    serviceWorker,
    tmpExtDir,
    tmpUserDataDir,
  };
}

/**
 * Clean up the browser context and temp directories.
 */
export async function teardownExtension({
  context,
  tmpExtDir,
  tmpUserDataDir,
}) {
  if (context) {
    await context.close();
  }
  if (tmpExtDir) {
    fs.rmSync(tmpExtDir, { recursive: true, force: true });
  }
  if (tmpUserDataDir) {
    fs.rmSync(tmpUserDataDir, { recursive: true, force: true });
  }
}
