import * as api from "./api.js";

// Per-tab results: { scan, assessment, loading, error, emailScan, emailAssessment, emailLoading, emailError }
const tabResults = new Map();

// Tabs where email-scanner.js has been injected on-demand
const injectedEmailTabs = new Set();

// --- Token auto-refresh via chrome.alarms ---

const TOKEN_REFRESH_ALARM = "token-refresh";
const REFRESH_AHEAD_MS = 2 * 60 * 1000; // Fire 2 min before expiry

async function scheduleTokenRefresh() {
  const expiresAt = await api.getTokenExpiry();
  if (!expiresAt) return;

  const delayMs = Math.max(expiresAt - Date.now() - REFRESH_AHEAD_MS, 0);
  // chrome.alarms minimum granularity is ~1 minute; use delayInMinutes
  const delayMinutes = Math.max(delayMs / 60000, 0.08); // floor ~5 seconds

  chrome.alarms.create(TOKEN_REFRESH_ALARM, { delayInMinutes: delayMinutes });
}

function cancelTokenRefresh() {
  chrome.alarms.clear(TOKEN_REFRESH_ALARM);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== TOKEN_REFRESH_ALARM) return;

  try {
    await api.refreshAccessToken();
    await scheduleTokenRefresh(); // Reschedule with new expiry
  } catch {
    // Refresh failed — session is dead, signal the popup
    await api.clearToken();
    await chrome.storage.local.set({ auth_expired: true });
  }
});

// Schedule on browser startup (service worker may restart)
chrome.runtime.onStartup.addListener(() => {
  scheduleTokenRefresh();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("BrowseShield installed");
  scheduleTokenRefresh();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_SCAN" && sender.tab?.id != null) {
    handlePageScan(sender.tab.id, message.data);
    return;
  }

  if (message.type === "EMAIL_SCAN" && sender.tab?.id != null) {
    handleEmailScan(sender.tab.id, message.data);
    return;
  }

  if (message.type === "MAYBE_WEBMAIL" && sender.tab?.id != null) {
    const tabId = sender.tab.id;
    if (!injectedEmailTabs.has(tabId)) {
      injectedEmailTabs.add(tabId);
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["scripts/email-scanner.js"],
      });
    }
    return;
  }

  if (message.type === "GET_AUTH_STATE") {
    api.isAuthenticated().then((authed) => {
      sendResponse({ authenticated: authed });
    });
    return true; // async
  }

  if (message.type === "LOGIN") {
    api
      .login(message.email, message.password)
      .then(async (data) => {
        await chrome.storage.local.remove("auth_expired");
        await scheduleTokenRefresh();
        sendResponse({ success: true, user: data.user });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (message.type === "LOGOUT") {
    cancelTokenRefresh();
    api
      .logout()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }
});

async function handlePageScan(tabId, scanData) {
  const entry = { scan: scanData, assessment: null, loading: true, error: null };
  tabResults.set(tabId, entry);
  chrome.storage.session.set({ [`scan_${tabId}`]: entry });

  const authed = await api.isAuthenticated();
  if (!authed) {
    entry.loading = false;
    chrome.storage.session.set({ [`scan_${tabId}`]: entry });
    return;
  }

  try {
    const result = await api.assessUrl(scanData.url, {
      forms: scanData.forms,
      links: scanData.links,
      meta: scanData.meta,
      security: scanData.security,
    });
    entry.assessment = result;
  } catch (err) {
    entry.error = err.message;
  } finally {
    entry.loading = false;
    chrome.storage.session.set({ [`scan_${tabId}`]: entry });
  }
}

async function handleEmailScan(tabId, emailData) {
  let entry = tabResults.get(tabId);
  if (!entry) {
    entry = { scan: null, assessment: null, loading: false, error: null };
    tabResults.set(tabId, entry);
  }

  entry.emailScan = emailData;
  entry.emailAssessment = null;
  entry.emailLoading = true;
  entry.emailError = null;
  chrome.storage.session.set({ [`scan_${tabId}`]: entry });

  const authed = await api.isAuthenticated();
  if (!authed) {
    entry.emailLoading = false;
    chrome.storage.session.set({ [`scan_${tabId}`]: entry });
    return;
  }

  try {
    const result = await api.assessEmail(emailData);
    entry.emailAssessment = result;
  } catch (err) {
    entry.emailError = err.message;
  } finally {
    entry.emailLoading = false;
    chrome.storage.session.set({ [`scan_${tabId}`]: entry });
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  tabResults.delete(tabId);
  injectedEmailTabs.delete(tabId);
});
