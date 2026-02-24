import { describe, it, expect, beforeEach, vi } from "vitest";
import { installChromeMock, resetStorage } from "./chrome-mock.js";

installChromeMock();

// Capture the listeners registered by background.js
const messageListeners = [];
const tabRemovedListeners = [];

chrome.runtime.onMessage.addListener = (fn) => messageListeners.push(fn);
chrome.runtime.onInstalled = { addListener: () => {} };
chrome.tabs.onRemoved.addListener = (fn) => tabRemovedListeners.push(fn);

// Mock api module before importing background
vi.mock("../scripts/api.js", () => ({
  isAuthenticated: vi.fn().mockResolvedValue(false),
  assessUrl: vi.fn().mockResolvedValue({
    safety: "safe",
    confidence: 95,
    reasons: ["All checks passed"],
    assessed_at: new Date().toISOString(),
  }),
  login: vi.fn().mockResolvedValue({
    access_token: "mock-token",
    user: { id: "1", email: "user@test.com", name: "Test" },
  }),
  logout: vi.fn().mockResolvedValue({ message: "Logged out" }),
}));

const api = await import("../scripts/api.js");

// Import background to trigger listener registration
await import("../scripts/background.js");

// Helper: simulate sending a message and getting a response
function sendMessage(message, sender = {}) {
  return new Promise((resolve) => {
    let responded = false;
    const sendResponse = (data) => {
      responded = true;
      resolve(data);
    };

    for (const listener of messageListeners) {
      const keepOpen = listener(message, sender, sendResponse);
      // If listener didn't return true and didn't call sendResponse synchronously,
      // the channel closes. For sync handlers, we check if sendResponse was called.
      if (!keepOpen && responded) return;
      if (keepOpen) return; // async handler, will call sendResponse later
    }

    // No listener handled it with a response
    resolve(undefined);
  });
}

// Small delay for async handlers in background.js (e.g., handlePageScan)
const tick = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
  resetStorage();
  vi.clearAllMocks();
  api.isAuthenticated.mockResolvedValue(false);
});

describe("PAGE_SCAN message", () => {
  it("stores scan data for the tab", async () => {
    const scanData = {
      url: "https://example.com",
      forms: [],
      links: { total: 5, external: 1 },
      meta: { isHttps: true, title: "Example" },
    };

    sendMessage(
      { type: "PAGE_SCAN", data: scanData },
      { tab: { id: 42 } }
    );

    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 42 });
    expect(response.data).toBeTruthy();
    expect(response.data.scan).toEqual(scanData);
  });

  it("calls assessUrl when authenticated", async () => {
    api.isAuthenticated.mockResolvedValue(true);

    const scanData = {
      url: "https://example.com",
      forms: [],
      links: { total: 3, external: 0 },
      meta: { isHttps: true, title: "Test" },
    };

    sendMessage(
      { type: "PAGE_SCAN", data: scanData },
      { tab: { id: 99 } }
    );

    await tick();

    expect(api.assessUrl).toHaveBeenCalledWith("https://example.com", {
      forms: scanData.forms,
      links: scanData.links,
      meta: scanData.meta,
    });
  });

  it("does not call assessUrl when not authenticated", async () => {
    api.isAuthenticated.mockResolvedValue(false);

    sendMessage(
      {
        type: "PAGE_SCAN",
        data: {
          url: "https://example.com",
          forms: [],
          links: { total: 0, external: 0 },
          meta: { isHttps: true, title: "X" },
        },
      },
      { tab: { id: 50 } }
    );

    await tick();

    expect(api.assessUrl).not.toHaveBeenCalled();
  });

  it("stores assessment result when authenticated", async () => {
    api.isAuthenticated.mockResolvedValue(true);

    sendMessage(
      {
        type: "PAGE_SCAN",
        data: {
          url: "https://example.com",
          forms: [],
          links: { total: 0, external: 0 },
          meta: { isHttps: true, title: "X" },
        },
      },
      { tab: { id: 77 } }
    );

    await tick();

    const response = await sendMessage({ type: "GET_SCAN", tabId: 77 });
    expect(response.data.assessment).toBeTruthy();
    expect(response.data.assessment.safety).toBe("safe");
    expect(response.data.assessment.confidence).toBe(95);
  });
});

describe("GET_SCAN message", () => {
  it("returns null for unknown tab", async () => {
    const response = await sendMessage({ type: "GET_SCAN", tabId: 999 });
    expect(response.data).toBeNull();
  });
});

describe("GET_AUTH_STATE message", () => {
  it("returns authenticated false by default", async () => {
    const response = await sendMessage({ type: "GET_AUTH_STATE" });
    expect(response.authenticated).toBe(false);
  });

  it("returns authenticated true when api reports it", async () => {
    api.isAuthenticated.mockResolvedValue(true);
    const response = await sendMessage({ type: "GET_AUTH_STATE" });
    expect(response.authenticated).toBe(true);
  });
});

describe("LOGIN message", () => {
  it("calls api.login and returns success", async () => {
    const response = await sendMessage({
      type: "LOGIN",
      email: "user@test.com",
      password: "pass",
    });
    expect(response.success).toBe(true);
    expect(response.user).toEqual({
      id: "1",
      email: "user@test.com",
      name: "Test",
    });
    expect(api.login).toHaveBeenCalledWith("user@test.com", "pass");
  });

  it("returns error on login failure", async () => {
    api.login.mockRejectedValue(new Error("Invalid credentials"));
    const response = await sendMessage({
      type: "LOGIN",
      email: "bad@test.com",
      password: "wrong",
    });
    expect(response.success).toBe(false);
    expect(response.error).toBe("Invalid credentials");
  });
});

describe("LOGOUT message", () => {
  it("calls api.logout and returns success", async () => {
    const response = await sendMessage({ type: "LOGOUT" });
    expect(response.success).toBe(true);
    expect(api.logout).toHaveBeenCalled();
  });
});

describe("tab removal", () => {
  it("cleans up stored data when tab is removed", async () => {
    sendMessage(
      {
        type: "PAGE_SCAN",
        data: {
          url: "https://example.com",
          forms: [],
          links: { total: 0, external: 0 },
          meta: { isHttps: true, title: "X" },
        },
      },
      { tab: { id: 123 } }
    );

    await tick();

    // Verify data exists
    let response = await sendMessage({ type: "GET_SCAN", tabId: 123 });
    expect(response.data).toBeTruthy();

    // Simulate tab removal
    for (const listener of tabRemovedListeners) {
      listener(123);
    }

    // Data should be gone
    response = await sendMessage({ type: "GET_SCAN", tabId: 123 });
    expect(response.data).toBeNull();
  });
});
