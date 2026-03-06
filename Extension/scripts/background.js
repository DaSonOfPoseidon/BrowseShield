import * as api from "./api.js";

// Per-tab results: { scan, assessment, loading, error }
const tabResults = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log("BrowseShield installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_SCAN" && sender.tab?.id != null) {
    handlePageScan(sender.tab.id, message.data);
    return;
  }

  if (message.type === "GET_SCAN") {
    const entry = tabResults.get(message.tabId) ?? null;
    sendResponse({ data: entry });
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
      .then((data) => sendResponse({ success: true, user: data.user }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (message.type === "LOGOUT") {
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

  const authed = await api.isAuthenticated();
  if (!authed) {
    entry.loading = false;
    return;
  }

  try {
    const result = await api.assessUrl(scanData.url, {
      forms: scanData.forms,
      links: scanData.links,
      meta: scanData.meta,
    });
    entry.assessment = result;
  } catch (err) {
    entry.error = err.message;
  } finally {
    entry.loading = false;
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  tabResults.delete(tabId);
});
