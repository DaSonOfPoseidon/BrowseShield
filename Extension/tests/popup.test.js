// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { installChromeMock, resetStorage } from "./chrome-mock.js";

installChromeMock();

// Set up minimal DOM before importing popup.js
function setupDOM() {
  // Build DOM using safe DOM methods
  document.body.textContent = "";
  document.body.className = "";

  const card = document.createElement("div");
  card.className = "popup-card";

  const btnSignIn = document.createElement("button");
  btnSignIn.id = "btn-sign-in";
  btnSignIn.hidden = true;
  card.appendChild(btnSignIn);

  const btnSignOut = document.createElement("button");
  btnSignOut.id = "btn-sign-out";
  btnSignOut.hidden = true;
  card.appendChild(btnSignOut);

  const loginSection = document.createElement("section");
  loginSection.id = "login-section";
  loginSection.hidden = true;

  const loginForm = document.createElement("form");
  loginForm.id = "login-form";

  const loginEmail = document.createElement("input");
  loginEmail.type = "email";
  loginEmail.id = "login-email";
  loginForm.appendChild(loginEmail);

  const loginPassword = document.createElement("input");
  loginPassword.type = "password";
  loginPassword.id = "login-password";
  loginForm.appendChild(loginPassword);

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  loginForm.appendChild(submitBtn);

  const loginError = document.createElement("p");
  loginError.id = "login-error";
  loginError.hidden = true;
  loginForm.appendChild(loginError);

  loginSection.appendChild(loginForm);
  card.appendChild(loginSection);

  const siteUrl = document.createElement("span");
  siteUrl.id = "site-url";
  card.appendChild(siteUrl);

  const emailSubjectWrapper = document.createElement("div");
  emailSubjectWrapper.id = "email-subject-wrapper";
  emailSubjectWrapper.hidden = true;
  const emailSubject = document.createElement("span");
  emailSubject.id = "email-subject";
  emailSubjectWrapper.appendChild(emailSubject);
  card.appendChild(emailSubjectWrapper);

  const progressRingWrapper = document.createElement("div");
  progressRingWrapper.id = "progress-ring-wrapper";
  card.appendChild(progressRingWrapper);

  const starsWrapper = document.createElement("div");
  starsWrapper.id = "stars-wrapper";
  card.appendChild(starsWrapper);

  const reasonsSection = document.createElement("section");
  reasonsSection.id = "reasons-section";
  reasonsSection.hidden = true;
  const reasonsList = document.createElement("ul");
  reasonsList.id = "reasons-list";
  reasonsSection.appendChild(reasonsList);
  card.appendChild(reasonsSection);

  const suspiciousLinksSection = document.createElement("section");
  suspiciousLinksSection.id = "suspicious-links-section";
  suspiciousLinksSection.hidden = true;

  const suspiciousLinksToggle = document.createElement("button");
  suspiciousLinksToggle.id = "suspicious-links-toggle";
  suspiciousLinksToggle.textContent = "Suspicious links ";
  const suspiciousLinksCount = document.createElement("span");
  suspiciousLinksCount.id = "suspicious-links-count";
  suspiciousLinksToggle.appendChild(suspiciousLinksCount);
  suspiciousLinksSection.appendChild(suspiciousLinksToggle);

  const suspiciousLinksList = document.createElement("ul");
  suspiciousLinksList.id = "suspicious-links-list";
  suspiciousLinksList.hidden = true;
  suspiciousLinksSection.appendChild(suspiciousLinksList);

  card.appendChild(suspiciousLinksSection);
  document.body.appendChild(card);
}

// Set up DOM before importing so $ works
setupDOM();

const popup = await import("../scripts/popup.js");
const {
  renderUrl,
  renderEmailMode,
  setupAuth,
  renderSuspiciousLinks,
  applyStatus,
  handleScanUpdate,
  showStatus,
  renderEntry,
  renderReasons,
  loadPortalBase,
  DEFAULT_PORTAL_BASE,
} = popup;

beforeEach(() => {
  setupDOM();
  resetStorage();
  vi.restoreAllMocks();
});

// ── handleScanUpdate ──

describe("handleScanUpdate", () => {
  it("clears status messages and shows Scanning... when loading", () => {
    showStatus("No data yet");
    expect(document.querySelector(".status-message")).toBeTruthy();

    handleScanUpdate({ loading: true });
    const msgs = document.querySelectorAll(".status-message");
    expect(msgs.length).toBe(1);
    expect(msgs[0].textContent).toBe("Scanning...");
  });

  it("clears status messages and shows Scanning... when emailLoading", () => {
    handleScanUpdate({ emailLoading: true });
    const msgs = document.querySelectorAll(".status-message");
    expect(msgs.length).toBe(1);
    expect(msgs[0].textContent).toBe("Scanning...");
  });

  it("clears status messages and renders entry when not loading", () => {
    showStatus("Scanning...");
    handleScanUpdate({
      assessment: { safety: "safe", confidence: 90, reasons: [] },
    });
    expect(document.querySelector(".status-message")).toBeNull();
    const card = document.querySelector(".popup-card");
    expect(card.classList.contains("status-safe")).toBe(true);
  });
});

// ── renderEntry ──

describe("renderEntry", () => {
  it("shows error message when entry has error", () => {
    renderEntry({ error: "Network failure" });
    const msg = document.querySelector(".status-message.error");
    expect(msg).toBeTruthy();
    expect(msg.textContent).toBe("Network failure");
  });

  it("shows 'No assessment available' when no assessment and no error", () => {
    renderEntry({ scan: { url: "https://example.com" } });
    const msg = document.querySelector(".status-message");
    expect(msg).toBeTruthy();
    expect(msg.textContent).toBe("No assessment available");
  });

  it("renders assessment when present", () => {
    renderEntry({
      assessment: { safety: "suspicious", confidence: 60, reasons: ["Test"] },
    });
    const card = document.querySelector(".popup-card");
    expect(card.classList.contains("status-suspicious")).toBe(true);
  });
});

// ── renderUrl ──

describe("renderUrl", () => {
  it("displays hostname + pathname", () => {
    renderUrl("https://example.com/about");
    const el = document.getElementById("site-url");
    expect(el.textContent).toBe("example.com/about");
  });

  it("strips trailing slash", () => {
    renderUrl("https://example.com/");
    const el = document.getElementById("site-url");
    expect(el.textContent).toBe("example.com");
  });

  it("handles invalid URL (falls back to raw string)", () => {
    renderUrl("not-a-valid-url");
    const el = document.getElementById("site-url");
    expect(el.textContent).toBe("not-a-valid-url");
  });

  it("sets title attribute to full URL", () => {
    renderUrl("https://example.com/page");
    const el = document.getElementById("site-url");
    expect(el.title).toBe("https://example.com/page");
  });
});

// ── renderEmailMode ──

describe("renderEmailMode", () => {
  it("shows sender name + address when available", () => {
    renderEmailMode({
      emailScan: {
        sender: { name: "Alice", address: "alice@example.com" },
        subject: "Hello",
      },
    });
    const el = document.getElementById("site-url");
    expect(el.textContent).toBe("Alice <alice@example.com>");
  });

  it('shows "Unknown sender" when no sender name or address', () => {
    renderEmailMode({
      emailScan: { sender: {}, subject: "Hello" },
    });
    const el = document.getElementById("site-url");
    expect(el.textContent).toBe("Unknown sender");
  });

  it("shows subject line when available", () => {
    renderEmailMode({
      emailScan: {
        sender: { name: "Bob", address: "bob@test.com" },
        subject: "Important update",
      },
    });
    const wrapper = document.getElementById("email-subject-wrapper");
    const subjectEl = document.getElementById("email-subject");
    expect(wrapper.hidden).toBe(false);
    expect(subjectEl.textContent).toBe("Important update");
  });

  it("renders assessment when emailAssessment exists", () => {
    renderEmailMode({
      emailScan: {
        sender: { name: "Eve", address: "eve@evil.com" },
        subject: "Verify now",
      },
      emailAssessment: {
        safety: "unsafe",
        confidence: 15,
        reasons: ["Suspicious sender"],
        phishingIndicators: { suspiciousLinks: [] },
      },
    });
    const card = document.querySelector(".popup-card");
    expect(card.classList.contains("status-unsafe")).toBe(true);
  });

  it("shows loading state when emailLoading is true", () => {
    renderEmailMode({
      emailScan: { sender: { address: "a@b.com" } },
      emailLoading: true,
    });
    expect(document.body.classList.contains("state-loading")).toBe(true);
  });

  it("falls back to suspicious status when no assessment and not loading", () => {
    renderEmailMode({
      emailScan: { sender: { address: "a@b.com" } },
    });
    const card = document.querySelector(".popup-card");
    expect(card.classList.contains("status-suspicious")).toBe(true);
  });
});

// ── setupAuth ──

describe("setupAuth", () => {
  it("hides sign-in button when authenticated", () => {
    setupAuth(true);
    const btn = document.getElementById("btn-sign-in");
    expect(btn.hidden).toBe(true);
  });

  it("shows sign-out button when authenticated", () => {
    setupAuth(true);
    const btn = document.getElementById("btn-sign-out");
    expect(btn.hidden).toBe(false);
  });

  it("shows sign-in button when not authenticated", () => {
    setupAuth(false);
    const btn = document.getElementById("btn-sign-in");
    expect(btn.hidden).toBe(false);
  });

  it("hides sign-out button when not authenticated", () => {
    setupAuth(false);
    const btn = document.getElementById("btn-sign-out");
    expect(btn.hidden).toBe(true);
  });
});

// ── renderSuspiciousLinks ──

describe("renderSuspiciousLinks", () => {
  it("renders string links", () => {
    renderSuspiciousLinks(["https://evil.com", "https://phish.net"]);
    const items = document.querySelectorAll("#suspicious-links-list li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("https://evil.com");
    expect(items[1].textContent).toBe("https://phish.net");
  });

  it("renders object links with href property", () => {
    renderSuspiciousLinks([
      { href: "https://evil.com", displayText: "Click here" },
    ]);
    const items = document.querySelectorAll("#suspicious-links-list li");
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe("https://evil.com");
  });

  it("shows correct count", () => {
    renderSuspiciousLinks(["a", "b", "c"]);
    const countEl = document.getElementById("suspicious-links-count");
    expect(countEl.textContent).toBe("(3)");
  });

  it("toggle button shows/hides list", () => {
    renderSuspiciousLinks(["https://evil.com"]);
    const toggle = document.getElementById("suspicious-links-toggle");
    const list = document.getElementById("suspicious-links-list");

    expect(list.hidden).toBe(true);
    toggle.click();
    expect(list.hidden).toBe(false);
    toggle.click();
    expect(list.hidden).toBe(true);
  });
});

// ── renderReasons (wiki links) ──

describe("renderReasons", () => {
  it("renders {text, anchor} reasons as <a> links to the wiki section", async () => {
    await loadPortalBase();
    renderReasons([
      { text: "URL uses an IP address instead of a domain name", anchor: "has-ip-address" },
      { text: "Site does not use HTTPS", anchor: "https-absent" },
    ]);

    const items = document.querySelectorAll("#reasons-list li");
    expect(items.length).toBe(2);

    const firstLink = items[0].querySelector("a");
    expect(firstLink).toBeTruthy();
    expect(firstLink.getAttribute("href")).toBe(`${DEFAULT_PORTAL_BASE}/wiki#has-ip-address`);
    expect(firstLink.getAttribute("target")).toBe("_blank");
    expect(firstLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(firstLink.textContent).toBe("URL uses an IP address instead of a domain name");

    const secondLink = items[1].querySelector("a");
    expect(secondLink.getAttribute("href")).toBe(`${DEFAULT_PORTAL_BASE}/wiki#https-absent`);
  });

  it("renders a plain <li> with no <a> when reason is a legacy string (backward compat)", () => {
    renderReasons(["Legacy reason string"]);
    const items = document.querySelectorAll("#reasons-list li");
    expect(items.length).toBe(1);
    expect(items[0].querySelector("a")).toBeNull();
    expect(items[0].textContent).toBe("Legacy reason string");
  });

  it("renders a plain <li> when anchor is missing or null", () => {
    renderReasons([{ text: "No anchor here", anchor: null }]);
    const li = document.querySelector("#reasons-list li");
    expect(li.querySelector("a")).toBeNull();
    expect(li.textContent).toBe("No anchor here");
  });

  it("honors portal_base_url override from chrome.storage.local", async () => {
    await chrome.storage.local.set({ portal_base_url: "http://localhost:3000" });
    await loadPortalBase();

    renderReasons([{ text: "Login form detected", anchor: "has-password-field" }]);
    const link = document.querySelector("#reasons-list a");
    expect(link.getAttribute("href")).toBe("http://localhost:3000/wiki#has-password-field");
  });

  it("reveals the reasons-section when any reason is rendered", () => {
    expect(document.getElementById("reasons-section").hidden).toBe(true);
    renderReasons([{ text: "A reason", anchor: "has-ip-address" }]);
    expect(document.getElementById("reasons-section").hidden).toBe(false);
  });

  it("does nothing when reasons is empty or missing", () => {
    renderReasons([]);
    expect(document.getElementById("reasons-section").hidden).toBe(true);
    renderReasons(undefined);
    expect(document.getElementById("reasons-section").hidden).toBe(true);
  });
});
