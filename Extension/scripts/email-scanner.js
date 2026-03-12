// BrowseShield Email Scanner
// Extracts threat-relevant data from webmail clients for phishing analysis.

const MAX_BODY_LENGTH = 5000;
const DEBOUNCE_MS = 500;

const scannedEmails = new Set();

// ── Provider registry ──

const PROVIDERS = [
  {
    name: "gmail",
    match: (host) => host === "mail.google.com",
    getEmailId: () => {
      const match = window.location.hash.match(/#[^/]+\/([A-Za-z0-9]+)$/);
      return match ? match[1] : null;
    },
    getContainer: () => document.querySelector('div[role="main"]'),
    extract: (container) => {
      // Only scan the focused/active email in a conversation thread
      const activeMsg =
        container.querySelector(".kv") ||
        container.querySelector('div[data-message-id]') ||
        container;

      const senderEl = activeMsg.querySelector("span[email]");
      const sender = {
        name: senderEl?.getAttribute("name") || senderEl?.textContent?.trim() || "",
        address: senderEl?.getAttribute("email") || "",
      };

      const subjectEl = container.querySelector("h2.hP");
      const subject = subjectEl?.textContent?.trim() || "";

      const bodyEl = activeMsg.querySelector("div.a3s.aiL");
      const bodyText = stripContent(bodyEl, "gmail");

      const links = extractLinks(bodyEl);
      const attachments = extractAttachments(container, "gmail");
      const authInfo = extractGmailAuthInfo(activeMsg);

      return { sender, subject, bodyText, links, attachments, authInfo };
    },
  },
  {
    name: "outlook",
    match: (host) => /outlook\.(office|live|office365)\.com/.test(host),
    getEmailId: () => {
      const match = window.location.pathname.match(/\/mail\/[^/]*\/id\/([^/]+)/);
      if (match) return match[1];
      // Fallback: use URL hash or search params
      const params = new URLSearchParams(window.location.search);
      return params.get("ItemID") || params.get("id") || null;
    },
    getContainer: () =>
      // New Outlook UI
      document.querySelector('div[data-app-section="ConversationContainer"]') ||
      // Classic fallback
      document.querySelector('div[role="main"]'),
    extract: (container) => {
      const senderEl =
        container.querySelector('[autoid="__item_sender"]') ||
        container.querySelector('span[class*="sender"]');
      const sender = {
        name: senderEl?.textContent?.trim() || "",
        address: senderEl?.querySelector("[email]")?.getAttribute("email") ||
                 extractEmailFromText(senderEl?.textContent) || "",
      };

      const subjectEl =
        container.querySelector('span[role="heading"]') ||
        container.querySelector('[autoid="__item_subject"]');
      const subject = subjectEl?.textContent?.trim() || "";

      const bodyEl =
        container.querySelector('div[role="document"]') ||
        container.querySelector('div[class*="ReadingPane"]');
      const bodyText = stripContent(bodyEl, "outlook");

      const links = extractLinks(bodyEl);
      const attachments = extractAttachments(container, "outlook");

      return { sender, subject, bodyText, links, attachments, authInfo: null };
    },
  },
  {
    name: "generic",
    match: () => true,
    getEmailId: () => {
      // Best-effort: use URL path/hash
      return window.location.pathname + window.location.hash || null;
    },
    getContainer: () => document.body,
    extract: (container) => {
      const sender = extractGenericSender(container);
      const subject = extractGenericSubject(container);
      const bodyText = extractGenericBody(container);
      const links = extractLinks(container);

      return { sender, subject, bodyText, links, attachments: [], authInfo: null };
    },
  },
];

// ── Shared extraction helpers ──

function extractLinks(container) {
  if (!container) return [];
  const anchors = container.querySelectorAll("a[href]");
  const links = [];
  for (const a of anchors) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    links.push({
      href,
      displayText: a.textContent?.trim().slice(0, 200) || "",
    });
  }
  return links;
}

function extractAttachments(container, provider) {
  if (!container) return [];
  const filenames = [];

  if (provider === "gmail") {
    const els = container.querySelectorAll("div.aQH span.aV3");
    for (const el of els) {
      const name = el.textContent?.trim();
      if (name) filenames.push(name);
    }
  } else if (provider === "outlook") {
    const els = container.querySelectorAll(
      '[class*="AttachmentCard"] span, [class*="attachment"] span'
    );
    for (const el of els) {
      const name = el.textContent?.trim();
      if (name && name.includes(".")) filenames.push(name);
    }
  }

  return filenames;
}

function extractGmailAuthInfo(container) {
  // Opportunistically extract authentication metadata from sender details panel
  const info = {};
  const detailsPanel =
    container.querySelector('div.ajv') || // sender details dropdown
    container.querySelector('table.ajB');  // info table

  if (!detailsPanel) return null;

  const text = detailsPanel.textContent || "";

  const mailedBy = text.match(/mailed-by:\s*(\S+)/i);
  if (mailedBy) info.mailedBy = mailedBy[1];

  const signedBy = text.match(/signed-by:\s*(\S+)/i);
  if (signedBy) info.signedBy = signedBy[1];

  const hasEncryption = text.match(/standard encryption/i) || text.match(/TLS/i);
  if (hasEncryption) info.encryption = "TLS";

  return Object.keys(info).length > 0 ? info : null;
}

function stripContent(element, provider) {
  if (!element) return "";
  const clone = element.cloneNode(true);

  // Remove quoted replies
  const blockquotes = clone.querySelectorAll("blockquote");
  for (const bq of blockquotes) bq.remove();

  // Remove signatures
  if (provider === "gmail") {
    const sigs = clone.querySelectorAll("div.gmail_signature");
    for (const sig of sigs) sig.remove();
  } else if (provider === "outlook") {
    const sigs = clone.querySelectorAll("div#Signature, div[id*='Signature']");
    for (const sig of sigs) sig.remove();
  }

  let text = clone.textContent || "";

  // Strip lines starting with > (quoted text)
  text = text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n");

  // Collapse whitespace and truncate
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, MAX_BODY_LENGTH);
}

// ── Generic provider helpers ──

function extractGenericSender(container) {
  // Look for mailto links near "From:" text
  const mailtoLinks = container.querySelectorAll('a[href^="mailto:"]');
  for (const link of mailtoLinks) {
    const parent = link.closest("tr, div, p, li");
    if (parent && /from/i.test(parent.textContent)) {
      return {
        name: link.textContent?.trim() || "",
        address: link.getAttribute("href").replace("mailto:", "").split("?")[0],
      };
    }
  }

  // Fallback: find "From:" label and nearby text
  const allText = container.innerHTML;
  const fromMatch = allText.match(/From:\s*([^<\n]+)/i);
  const emailMatch = allText.match(/From:[^<]*<([^>]+)>/i) ||
                     allText.match(/From:\s*(\S+@\S+)/i);
  return {
    name: fromMatch ? fromMatch[1].trim() : "",
    address: emailMatch ? emailMatch[1] : "",
  };
}

function extractGenericSubject(container) {
  // Look for "Subject:" label
  const allText = container.textContent || "";
  const match = allText.match(/Subject:\s*([^\n]+)/i);
  return match ? match[1].trim().slice(0, 500) : "";
}

function extractGenericBody(container) {
  // Use the largest text block as body (heuristic)
  const candidates = container.querySelectorAll("div, td, article, section");
  let bestEl = null;
  let bestLen = 0;
  for (const el of candidates) {
    const len = (el.textContent || "").length;
    if (len > bestLen && len < 50000) {
      bestLen = len;
      bestEl = el;
    }
  }
  return stripContent(bestEl || container, "generic");
}

function extractEmailFromText(text) {
  if (!text) return "";
  const match = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? match[0] : "";
}

// ── Core scanning logic ──

function detectProvider() {
  const host = window.location.hostname;
  return PROVIDERS.find((p) => p.match(host));
}

function scanEmail() {
  const provider = detectProvider();
  if (!provider) return;

  const emailId = provider.getEmailId();
  if (!emailId) return;

  // Dedup: don't rescan the same email
  const dedupeKey = `${provider.name}:${emailId}`;
  if (scannedEmails.has(dedupeKey)) return;

  const container = provider.getContainer();
  if (!container) return;

  const extracted = provider.extract(container);

  // Require at minimum a sender address or subject to consider it a real email
  if (!extracted.sender.address && !extracted.subject) return;

  scannedEmails.add(dedupeKey);

  const emailData = {
    provider: provider.name,
    emailId,
    sender: extracted.sender,
    subject: extracted.subject,
    bodyText: extracted.bodyText,
    links: extracted.links,
    attachments: extracted.attachments || [],
    authInfo: extracted.authInfo || null,
    extractedAt: new Date().toISOString(),
  };

  chrome.runtime.sendMessage({ type: "EMAIL_SCAN", data: emailData });
}

// ── MutationObserver with debounce ──

let debounceTimer = null;

function onMutation() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    scanEmail();
  }, DEBOUNCE_MS);
}

function startObserver() {
  const observer = new MutationObserver(onMutation);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ── Initialize ──

function initEmailScanner() {
  // Initial scan
  scanEmail();
  // Watch for navigation within the SPA
  startObserver();
}

// Only auto-init in browser context (skip during test imports)
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEmailScanner);
  } else {
    initEmailScanner();
  }
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PROVIDERS,
    scannedEmails,
    detectProvider,
    scanEmail,
    extractLinks,
    extractAttachments,
    stripContent,
    extractGmailAuthInfo,
    extractGenericSender,
    extractGenericSubject,
    extractGenericBody,
    extractEmailFromText,
    MAX_BODY_LENGTH,
  };
}
