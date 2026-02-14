const scanResults = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log("BrowseShield installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_SCAN" && sender.tab?.id != null) {
    scanResults.set(sender.tab.id, message.data);
    return;
  }

  if (message.type === "GET_SCAN") {
    const tabId = message.tabId;
    const data = scanResults.get(tabId) ?? null;
    sendResponse({ data });
    return;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  scanResults.delete(tabId);
});
