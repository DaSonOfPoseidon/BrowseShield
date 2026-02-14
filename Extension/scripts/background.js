chrome.runtime.onInstalled.addListener(() => {
  console.log("BrowseShield installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_SCAN") {
    console.log("Page scan received:", message.data);
  }
});

