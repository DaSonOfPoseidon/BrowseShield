import { describe, it, expect, beforeEach, vi } from "vitest";
import { installChromeMock, resetStorage } from "./chrome-mock.js";

installChromeMock();

// Capture listeners registered by background.js
const messageListeners = [];
const tabRemovedListeners = [];

chrome.runtime.onMessage.addListener = (fn) => messageListeners.push(fn);
chrome.runtime.onInstalled = { addListener: () => {} };
chrome.tabs.onRemoved.addListener = (fn) => tabRemovedListeners.push(fn);
chrome.scripting.executeScript = vi.fn().mockResolvedValue(undefined);

// Mock api module before importing background
vi.mock("../scripts/api.js", () => ({
  isAuthenticated: vi.fn().mockResolvedValue(false),
  assessUrl: vi.fn().mockResolvedValue({
    safety: "safe",
    confidence: 95,
    reasons: ["All checks passed"],
    assessed_at: new Date().toISOString(),
  }),
  assessEmail: vi.fn().mockResolvedValue({
    safety: "suspicious",
    confidence: 65,
    reasons: ["Sender domain mismatch"],
    phishingIndicators: {
      senderMismatch: true,
      suspiciousLinks: ["https://evil.com"],
      urgencyLanguage: false,
      suspiciousAttachments: false,
    },
    assessed_at: new Date().toISOString(),
  }),
  login: vi.fn().mockResolvedValue({
    access_token: "mock-token",
    user: { id: "1", email: "user@test.com", name: "Test" },
  }),
  logout: vi.fn().mockResolvedValue({ message: "Logged out" }),
}));

const api = await import("../scripts/api.js");
await import("../scripts/background.js");

function sendMessage(message, sender = {}) {
  return new Promise((resolve) => {
    let responded = false;
    const sendResponse = (data) => {
      responded = true;
      resolve(data);
    };
    for (const listener of messageListeners) {
      const keepOpen = listener(message, sender, sendResponse);
      if (!keepOpen && responded) return;
      if (keepOpen) return;
    }
    resolve(undefined);
  });
}

const tick = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
  resetStorage();
  vi.clearAllMocks();
  api.isAuthenticated.mockResolvedValue(false);
});

// ── EMAIL_SCAN message handling ──

describe("EMAIL_SCAN message", () => {
  const emailData = {
    provider: "gmail",
    emailId: "abc123",
    sender: { name: "Test Sender", address: "sender@example.com" },
    subject: "Urgent: Verify your account",
    bodyText: "Please click the link below to verify...",
    links: [{ href: "https://evil.com/login", displayText: "Verify Now" }],
    attachments: ["invoice.pdf"],
    extractedAt: new Date().toISOString(),
  };

  it("stores email scan data for the tab", async () => {
    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 10 } }
    );
    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 10 });
    expect(response.data.emailScan).toEqual(emailData);
  });

  it("calls assessEmail when authenticated", async () => {
    api.isAuthenticated.mockResolvedValue(true);

    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 20 } }
    );
    await tick();

    expect(api.assessEmail).toHaveBeenCalledWith(emailData);
  });

  it("skips API call when not authenticated", async () => {
    api.isAuthenticated.mockResolvedValue(false);

    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 30 } }
    );
    await tick();

    expect(api.assessEmail).not.toHaveBeenCalled();
  });

  it("stores assessment result when authenticated", async () => {
    api.isAuthenticated.mockResolvedValue(true);

    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 40 } }
    );
    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 40 });
    expect(response.data.emailAssessment).toBeTruthy();
    expect(response.data.emailAssessment.safety).toBe("suspicious");
    expect(response.data.emailAssessment.phishingIndicators.senderMismatch).toBe(true);
  });

  it("stores error when assessEmail fails", async () => {
    api.isAuthenticated.mockResolvedValue(true);
    api.assessEmail.mockRejectedValue(new Error("Network error"));

    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 50 } }
    );
    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 50 });
    expect(response.data.emailError).toBe("Network error");
    expect(response.data.emailAssessment).toBeNull();
  });

  it("sets emailLoading to false after completion", async () => {
    api.isAuthenticated.mockResolvedValue(true);

    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 60 } }
    );
    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 60 });
    expect(response.data.emailLoading).toBe(false);
  });

  it("creates tab entry if none exists", async () => {
    // Send EMAIL_SCAN without a prior PAGE_SCAN
    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 70 } }
    );
    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 70 });
    expect(response.data).toBeTruthy();
    expect(response.data.emailScan).toEqual(emailData);
  });
});

// ── MAYBE_WEBMAIL message handling ──

describe("MAYBE_WEBMAIL message", () => {
  it("injects email-scanner.js via chrome.scripting", async () => {
    sendMessage(
      { type: "MAYBE_WEBMAIL", data: { url: "https://webmail.example.com" } },
      { tab: { id: 100 } }
    );
    await tick();

    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 100 },
      files: ["scripts/email-scanner.js"],
    });
  });

  it("does not double-inject on the same tab", async () => {
    sendMessage(
      { type: "MAYBE_WEBMAIL", data: { url: "https://webmail.example.com" } },
      { tab: { id: 200 } }
    );
    sendMessage(
      { type: "MAYBE_WEBMAIL", data: { url: "https://webmail.example.com" } },
      { tab: { id: 200 } }
    );
    await tick();

    expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(1);
  });
});

// ── Tab removal cleans up email data ──

describe("tab removal cleans up email data", () => {
  it("removes email scan data when tab is closed", async () => {
    const emailData = {
      provider: "gmail",
      emailId: "xyz",
      sender: { name: "A", address: "a@b.com" },
      subject: "Test",
      bodyText: "body",
      links: [],
      attachments: [],
      extractedAt: new Date().toISOString(),
    };

    sendMessage(
      { type: "EMAIL_SCAN", data: emailData },
      { tab: { id: 300 } }
    );
    await tick();

    let response = await sendMessage({ type: "GET_SCAN", tabId: 300 });
    expect(response.data).toBeTruthy();

    // Simulate tab removal
    for (const listener of tabRemovedListeners) {
      listener(300);
    }

    response = await sendMessage({ type: "GET_SCAN", tabId: 300 });
    expect(response.data).toBeNull();
  });
});
