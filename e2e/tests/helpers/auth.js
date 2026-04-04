/**
 * Auth Helper
 *
 * Logs in the test user through the extension's real popup auth flow.
 */

/**
 * Log in via the extension popup's login form.
 *
 * Exercises the full auth chain:
 *   popup.js sendMessage({type:"LOGIN"})
 *   → background.js → api.login()
 *   → Flask /v1/auth/login
 *   → bcrypt check → JWT issued → stored in chrome.storage.local
 *
 * @param {import('playwright').BrowserContext} context
 * @param {string} extensionId
 * @param {string} email
 * @param {string} password
 */
export async function loginViaPopup(
  context,
  extensionId,
  email = "e2e@browseshield.test",
  password = "testpass123",
) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`);

  // Wait for popup to initialise
  await page.waitForSelector("#btn-sign-in", { timeout: 10_000 });

  // Click "Sign in" to reveal the login form
  await page.click("#btn-sign-in");
  await page.waitForSelector("#login-section:not([hidden])", {
    timeout: 5_000,
  });

  // Fill credentials
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);

  // Submit
  await page.click(".login-submit");

  // Wait for login to complete — sign-out button appears when authenticated
  await page.waitForSelector("#btn-sign-out:not([hidden])", {
    timeout: 15_000,
  });

  await page.close();
}

/**
 * Verify that the extension is authenticated by checking the popup state.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {string} extensionId
 * @returns {boolean}
 */
export async function isAuthenticated(context, extensionId) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`);

  await page.waitForSelector("#btn-sign-in, #btn-sign-out", {
    timeout: 10_000,
  });

  const signOutVisible = await page
    .locator("#btn-sign-out:not([hidden])")
    .isVisible();
  await page.close();
  return signOutVisible;
}
