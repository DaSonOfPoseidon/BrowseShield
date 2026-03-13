// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { installChromeMock, resetStorage } from "./chrome-mock.js";

installChromeMock();

// Mock chrome.runtime.sendMessage to capture messages
let sentMessages = [];
chrome.runtime.sendMessage = (msg) => sentMessages.push(msg);

// Import the module's exported functions for testing
const scanner = await import("../scripts/email-scanner.js");
const {
  PROVIDERS,
  scannedEmails,
  detectProvider,
  extractLinks,
  extractAttachments,
  stripContent,
  extractGmailAuthInfo,
  extractGenericSender,
  extractGenericSubject,
  extractGenericBody,
  extractEmailFromText,
  MAX_BODY_LENGTH,
} = scanner;

beforeEach(() => {
  resetStorage();
  sentMessages = [];
  scannedEmails.clear();
  vi.restoreAllMocks();
});

// Helper: create a DOM element from a template string (safe — test-only with static strings)
function html(strings, ...values) {
  const template = document.createElement("template");
  template.innerHTML = String.raw(strings, ...values);
  return template.content.firstElementChild;
}

// ── Provider matching ──

describe("provider matching", () => {
  it("matches Gmail by hostname", () => {
    const gmail = PROVIDERS.find((p) => p.name === "gmail");
    expect(gmail.match("mail.google.com")).toBe(true);
    expect(gmail.match("google.com")).toBe(false);
  });

  it("matches Outlook variants", () => {
    const outlook = PROVIDERS.find((p) => p.name === "outlook");
    expect(outlook.match("outlook.office.com")).toBe(true);
    expect(outlook.match("outlook.live.com")).toBe(true);
    expect(outlook.match("outlook.office365.com")).toBe(true);
    expect(outlook.match("outlook.example.com")).toBe(false);
  });

  it("generic matches everything", () => {
    const generic = PROVIDERS.find((p) => p.name === "generic");
    expect(generic.match("anything.com")).toBe(true);
    expect(generic.match("")).toBe(true);
  });

  it("providers are ordered: gmail, outlook, generic", () => {
    expect(PROVIDERS[0].name).toBe("gmail");
    expect(PROVIDERS[1].name).toBe("outlook");
    expect(PROVIDERS[2].name).toBe("generic");
  });
});

// ── Email ID extraction ──

describe("email ID extraction", () => {
  it("Gmail extracts ID from URL hash", () => {
    const gmail = PROVIDERS.find((p) => p.name === "gmail");
    Object.defineProperty(window, "location", {
      value: { ...window.location, hash: "#inbox/FMfcgzQXJZlKhrBDMWfbdBJjPctpFPhQ" },
      writable: true,
      configurable: true,
    });
    expect(gmail.getEmailId()).toBe("FMfcgzQXJZlKhrBDMWfbdBJjPctpFPhQ");
    Object.defineProperty(window, "location", {
      value: { ...window.location, hash: "" },
      writable: true,
      configurable: true,
    });
  });

  it("Gmail returns null for inbox view (no email open)", () => {
    const gmail = PROVIDERS.find((p) => p.name === "gmail");
    Object.defineProperty(window, "location", {
      value: { ...window.location, hash: "#inbox" },
      writable: true,
      configurable: true,
    });
    expect(gmail.getEmailId()).toBeNull();
    Object.defineProperty(window, "location", {
      value: { ...window.location, hash: "" },
      writable: true,
      configurable: true,
    });
  });
});

// ── Link extraction ──

describe("extractLinks", () => {
  it("extracts href and display text from anchor elements", () => {
    const container = html`<div><a href="https://example.com">Example</a><a href="https://evil.com/login">Click here</a></div>`;
    const links = extractLinks(container);
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe("https://example.com");
    expect(links[0].displayText).toBe("Example");
    expect(links[1].href).toBe("https://evil.com/login");
    expect(links[1].displayText).toBe("Click here");
  });

  it("skips hash-only and javascript: links", () => {
    const container = html`<div><a href="#">skip</a><a href="javascript:void(0)">skip</a><a href="https://valid.com">keep</a></div>`;
    const links = extractLinks(container);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe("https://valid.com");
  });

  it("returns empty array for null container", () => {
    expect(extractLinks(null)).toEqual([]);
  });

  it("truncates display text to 200 chars", () => {
    const container = document.createElement("div");
    const a = document.createElement("a");
    a.setAttribute("href", "https://example.com");
    a.textContent = "A".repeat(300);
    container.appendChild(a);
    const links = extractLinks(container);
    expect(links[0].displayText.length).toBe(200);
  });
});

// ── Body stripping ──

describe("stripContent", () => {
  it("removes blockquote elements", () => {
    const el = html`<div><p>Hello</p><blockquote>Quoted text</blockquote></div>`;
    const text = stripContent(el, "gmail");
    expect(text).toContain("Hello");
    expect(text).not.toContain("Quoted text");
  });

  it("removes Gmail signatures", () => {
    const el = html`<div><p>Body text</p><div class="gmail_signature">-- Sent from Gmail</div></div>`;
    const text = stripContent(el, "gmail");
    expect(text).toContain("Body text");
    expect(text).not.toContain("Sent from Gmail");
  });

  it("removes Outlook signatures", () => {
    const el = html`<div><p>Body text</p><div id="Signature">My Signature</div></div>`;
    const text = stripContent(el, "outlook");
    expect(text).toContain("Body text");
    expect(text).not.toContain("My Signature");
  });

  it("strips lines starting with >", () => {
    const el = document.createElement("div");
    el.textContent = "Hello\n> quoted line\nWorld";
    const text = stripContent(el, "generic");
    expect(text).toContain("Hello");
    expect(text).toContain("World");
    expect(text).not.toContain("quoted line");
  });

  it("truncates to MAX_BODY_LENGTH", () => {
    const el = document.createElement("div");
    el.textContent = "A".repeat(10000);
    const text = stripContent(el, "generic");
    expect(text.length).toBe(MAX_BODY_LENGTH);
  });

  it("returns empty string for null element", () => {
    expect(stripContent(null, "gmail")).toBe("");
  });
});

// ── Attachment extraction ──

describe("extractAttachments", () => {
  it("extracts Gmail attachment filenames", () => {
    const container = html`<div><div class="aQH"><span class="aV3">report.pdf</span></div><div class="aQH"><span class="aV3">invoice.xlsx</span></div></div>`;
    const files = extractAttachments(container, "gmail");
    expect(files).toEqual(["report.pdf", "invoice.xlsx"]);
  });

  it("returns empty array for null container", () => {
    expect(extractAttachments(null, "gmail")).toEqual([]);
  });
});

// ── Deduplication ──

describe("deduplication", () => {
  it("tracks scanned email IDs", () => {
    scannedEmails.add("gmail:abc123");
    expect(scannedEmails.has("gmail:abc123")).toBe(true);
    expect(scannedEmails.has("gmail:def456")).toBe(false);
  });

  it("dedup key includes provider name", () => {
    scannedEmails.add("gmail:abc123");
    expect(scannedEmails.has("outlook:abc123")).toBe(false);
  });
});

// ── Email from text extraction ──

describe("extractEmailFromText", () => {
  it("extracts email from text containing an address", () => {
    expect(extractEmailFromText("John Doe <john@example.com>")).toBe("john@example.com");
  });

  it("returns empty string for null input", () => {
    expect(extractEmailFromText(null)).toBe("");
  });

  it("returns empty string for text without email", () => {
    expect(extractEmailFromText("no email here")).toBe("");
  });
});

// ── Generic extraction helpers ──

describe("extractGenericSubject", () => {
  it("extracts subject from text containing Subject: label", () => {
    const container = document.createElement("div");
    container.textContent = "From: John\nSubject: Important Meeting\nDate: Today";
    expect(extractGenericSubject(container)).toBe("Important Meeting");
  });

  it("returns empty string when no subject found", () => {
    const container = document.createElement("div");
    container.textContent = "No subject label here";
    expect(extractGenericSubject(container)).toBe("");
  });
});

describe("extractGenericSender", () => {
  it("extracts sender from mailto link near From text", () => {
    const container = html`<div><div>From: <a href="mailto:sender@example.com">Sender Name</a></div></div>`;
    const sender = extractGenericSender(container);
    expect(sender.address).toBe("sender@example.com");
    expect(sender.name).toBe("Sender Name");
  });
});
