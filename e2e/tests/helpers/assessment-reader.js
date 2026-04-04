/**
 * Assessment Reader
 *
 * Polls chrome.storage.session via the extension's service worker
 * to read assessment results after page navigation.
 *
 * Matches entries by URL since Playwright doesn't expose Chrome's
 * internal tab IDs.
 */

/**
 * Re-acquire the service worker reference if Chrome has recycled it.
 *
 * @param {import('playwright').BrowserContext} context
 * @returns {import('playwright').Worker}
 */
export async function getServiceWorker(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 10_000 });
  }
  return sw;
}

/**
 * Wait for the extension to complete its assessment of a page.
 *
 * Polls chrome.storage.session via the service worker, looking for
 * an entry whose scan.url matches the target URL and loading is false.
 *
 * @param {import('playwright').Worker} serviceWorker
 * @param {string} targetUrl - The URL that was navigated to
 * @param {number} timeoutMs - Max time to wait (default 30s)
 * @returns {object} The full storage entry: { scan, assessment, loading, error }
 */
export async function waitForAssessment(
  serviceWorker,
  targetUrl,
  timeoutMs = 30_000,
) {
  const pollInterval = 500;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await serviceWorker.evaluate(async (url) => {
      const allData = await chrome.storage.session.get(null);

      for (const [key, entry] of Object.entries(allData)) {
        if (!key.startsWith("scan_")) continue;
        if (entry.scan?.url !== url) continue;

        if (entry.loading) {
          return { status: "loading" };
        }

        return { status: "complete", entry };
      }

      return { status: "no_data" };
    }, targetUrl);

    if (result.status === "complete") {
      return result.entry;
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(
    `Assessment timed out after ${timeoutMs}ms for ${targetUrl}`,
  );
}

/**
 * Clear all scan entries from session storage.
 * Useful between test runs to avoid stale data.
 *
 * @param {import('playwright').Worker} serviceWorker
 */
export async function clearAssessments(serviceWorker) {
  await serviceWorker.evaluate(async () => {
    const allData = await chrome.storage.session.get(null);
    const scanKeys = Object.keys(allData).filter((k) => k.startsWith("scan_"));
    if (scanKeys.length > 0) {
      await chrome.storage.session.remove(scanKeys);
    }
  });
}
