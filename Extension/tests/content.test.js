// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { installChromeMock } from "./chrome-mock.js";

installChromeMock();

// Override sendMessage with a vi.fn() so we can spy on calls
chrome.runtime.sendMessage = vi.fn();

// Import content.js (uses require/module.exports)
const { scanForms, scanLinks, scanMeta, detectWebmail, scanPage } = require("../scripts/content.js");

beforeEach(() => {
  document.body.innerHTML = "";
  document.title = "";
  chrome.runtime.sendMessage.mockClear();
});

// --- scanForms ---

describe("scanForms", () => {
  it("extracts action, method, password field presence, input count from a form", () => {
    document.body.innerHTML = `
      <form action="/login" method="post">
        <input type="text" name="user" />
        <input type="password" name="pass" />
        <input type="submit" />
      </form>
    `;
    const forms = scanForms();
    expect(forms).toHaveLength(1);
    expect(forms[0]).toHaveProperty("action");
    expect(forms[0]).toHaveProperty("method");
    expect(forms[0].hasPasswordField).toBe(true);
    expect(forms[0].inputCount).toBe(3);
  });

  it("detects password fields in forms", () => {
    document.body.innerHTML = `
      <form>
        <input type="password" />
      </form>
    `;
    const forms = scanForms();
    expect(forms[0].hasPasswordField).toBe(true);
  });

  it("returns empty array when page has no forms", () => {
    document.body.innerHTML = "<p>No forms here</p>";
    const forms = scanForms();
    expect(forms).toEqual([]);
  });

  it("handles forms without action attribute", () => {
    document.body.innerHTML = "<form><input type='text' /></form>";
    const forms = scanForms();
    expect(forms).toHaveLength(1);
    // action defaults to the current page URL when not specified
    expect(forms[0]).toHaveProperty("action");
  });

  it("counts multiple inputs correctly", () => {
    document.body.innerHTML = `
      <form>
        <input type="text" />
        <input type="email" />
        <input type="tel" />
        <input type="number" />
        <input type="hidden" />
      </form>
    `;
    const forms = scanForms();
    expect(forms[0].inputCount).toBe(5);
  });
});

// --- scanLinks ---

describe("scanLinks", () => {
  it("counts total links on page", () => {
    document.body.innerHTML = `
      <a href="https://example.com">One</a>
      <a href="https://example.com/about">Two</a>
      <a href="https://other.com">Three</a>
    `;
    const result = scanLinks();
    expect(result.total).toBe(3);
  });

  it("identifies external links (different origin)", () => {
    // jsdom default location is about:blank; set a known origin
    Object.defineProperty(window, "location", {
      value: new URL("https://mysite.com/page"),
      writable: true,
      configurable: true,
    });
    document.body.innerHTML = `
      <a href="https://mysite.com/about">Internal</a>
      <a href="https://external.com/phish">External</a>
    `;
    const result = scanLinks();
    expect(result.external).toBe(1);
  });

  it("treats same-origin links as internal (external count = 0)", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://mysite.com/page"),
      writable: true,
      configurable: true,
    });
    document.body.innerHTML = `
      <a href="https://mysite.com/one">One</a>
      <a href="https://mysite.com/two">Two</a>
    `;
    const result = scanLinks();
    expect(result.external).toBe(0);
  });

  it("handles malformed href gracefully (no crash)", () => {
    document.body.innerHTML = `<a href="not-a-url">Bad</a>`;
    expect(() => scanLinks()).not.toThrow();
  });

  it("returns { total, external } shape", () => {
    document.body.innerHTML = "";
    const result = scanLinks();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("external");
    expect(typeof result.total).toBe("number");
    expect(typeof result.external).toBe("number");
  });
});

// --- scanMeta ---

describe("scanMeta", () => {
  it("detects HTTPS protocol", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://secure.com"),
      writable: true,
      configurable: true,
    });
    const meta = scanMeta();
    expect(meta.isHttps).toBe(true);
  });

  it("detects HTTP protocol", () => {
    Object.defineProperty(window, "location", {
      value: new URL("http://insecure.com"),
      writable: true,
      configurable: true,
    });
    const meta = scanMeta();
    expect(meta.isHttps).toBe(false);
  });

  it("captures document title", () => {
    document.title = "My Cool Page";
    const meta = scanMeta();
    expect(meta.title).toBe("My Cool Page");
  });
});

// --- detectWebmail ---

describe("detectWebmail", () => {
  it("skips Gmail (mail.google.com) - does NOT send message", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://mail.google.com/mail/u/0/"),
      writable: true,
      configurable: true,
    });
    // Set up all heuristics to match
    document.body.innerHTML = [
      '<a href="mailto:test@example.com">Email</a>',
      "<p>From Subject Inbox Compose</p>",
      ...Array.from({ length: 6 }, () => '<div role="listitem">Item</div>'),
    ].join("");
    detectWebmail();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("skips Outlook domains - does NOT send message", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://outlook.office.com/mail"),
      writable: true,
      configurable: true,
    });
    document.body.innerHTML = [
      '<a href="mailto:test@example.com">Email</a>',
      "<p>From Subject Inbox Compose</p>",
      ...Array.from({ length: 6 }, () => '<div role="listitem">Item</div>'),
    ].join("");
    detectWebmail();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("sends MAYBE_WEBMAIL when all heuristics match", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://webmail.example.com/inbox"),
      writable: true,
      configurable: true,
    });
    document.body.innerHTML = [
      '<a href="mailto:test@example.com">Email</a>',
      "<p>From Subject Inbox Compose</p>",
      ...Array.from({ length: 6 }, () => '<div role="row">Row</div>'),
    ].join("");
    detectWebmail();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "MAYBE_WEBMAIL",
      data: { url: "https://webmail.example.com/inbox" },
    });
  });

  it("does NOT send when only some heuristics match", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://webmail.example.com/inbox"),
      writable: true,
      configurable: true,
    });
    // Only mailto links, no email headers, no message list
    document.body.innerHTML = [
      '<a href="mailto:test@example.com">Email</a>',
      "<p>Nothing relevant here</p>",
    ].join("");
    detectWebmail();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
});

// --- scanPage ---

describe("scanPage", () => {
  it("sends PAGE_SCAN message with url, forms, links, meta", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://testsite.com/page"),
      writable: true,
      configurable: true,
    });
    document.title = "Test Page";
    document.body.innerHTML = "<p>Simple page</p>";

    scanPage();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const call = chrome.runtime.sendMessage.mock.calls[0][0];
    expect(call.type).toBe("PAGE_SCAN");
    expect(call.data).toHaveProperty("url", "https://testsite.com/page");
    expect(call.data).toHaveProperty("forms");
    expect(call.data).toHaveProperty("links");
    expect(call.data).toHaveProperty("meta");
    expect(Array.isArray(call.data.forms)).toBe(true);
    expect(call.data.links).toHaveProperty("total");
    expect(call.data.links).toHaveProperty("external");
    expect(call.data.meta).toHaveProperty("isHttps");
    expect(call.data.meta).toHaveProperty("title");
  });
});
