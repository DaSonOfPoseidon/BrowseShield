const $ = (id) => document.getElementById(id);

// ── Safety color palettes ──

const COLORS = {
  safe:       { ring: "#34c759", muted: "#b4e6c2", star: "#34c759", starMuted: "#b4e6c2" },
  suspicious: { ring: "#f5a623", muted: "#f5d89a", star: "#f5a623", starMuted: "#f5d89a" },
  unsafe:     { ring: "#e5383b", muted: "#f5b0b1", star: "#e5383b", starMuted: "#f5b0b1" },
};

const STAR_RATINGS = { safe: 5, suspicious: 3, unsafe: 1 };

// ── Portal URL (for wiki links in the reasons list) ──

const DEFAULT_PORTAL_BASE = "https://browseshield.dev";
let _portalBase = DEFAULT_PORTAL_BASE;

async function loadPortalBase() {
  try {
    const { portal_base_url } = await chrome.storage.local.get("portal_base_url");
    _portalBase =
      typeof portal_base_url === "string" && portal_base_url
        ? portal_base_url
        : DEFAULT_PORTAL_BASE;
  } catch {
    _portalBase = DEFAULT_PORTAL_BASE;
  }
}

// ── Init ──

async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    showError("No active tab");
    return;
  }

  document.body.classList.add("state-loading");

  // Preload portal base so reason links have the right host by the time we render.
  await loadPortalBase();

  // Show URL immediately
  if (tab.url) {
    renderUrl(tab.url);
  }

  // Render default ring (no data yet)
  renderProgressRing(0, "#d4d4dc");
  renderStars(0, "#d4d4dc", "#f0f0f2");

  // Register listener FIRST to avoid race condition
  const storageKey = `scan_${tab.id}`;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes[storageKey]) {
      const updated = changes[storageKey].newValue;
      if (updated) handleScanUpdate(updated);
    }
  });

  // Check auth + read current storage state
  const [authState, stored] = await Promise.all([
    sendMessage({ type: "GET_AUTH_STATE" }),
    chrome.storage.session.get(storageKey),
  ]);

  document.body.classList.remove("state-loading");

  setupAuth(authState?.authenticated ?? false);

  const entry = stored[storageKey];
  if (!entry) {
    showStatus("No data yet");
  } else {
    handleScanUpdate(entry);
  }
}

function handleScanUpdate(entry) {
  // Clear any status messages
  document.querySelectorAll(".status-message").forEach((el) => el.remove());

  if (entry.loading || entry.emailLoading) {
    showStatus("Scanning...");
    return;
  }

  renderEntry(entry);
}

function renderEntry(entry) {
  // Update URL from scan data if available
  if (entry.scan?.url) {
    renderUrl(entry.scan.url);
  }

  // Email mode: if an email assessment exists, show it instead of page assessment
  if (entry.emailAssessment) {
    renderEmailMode(entry);
  } else if (entry.emailScan) {
    renderEmailMode(entry);
  } else if (entry.assessment) {
    renderAssessment(entry.assessment);
  } else if (entry.error) {
    showError(entry.error);
  } else {
    showStatus("No assessment available");
  }
}

// ── Message passing ──

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

// ── Auth UI ──

let authListenersAttached = false;

function setupAuth(authenticated) {
  const btnSignIn = $("btn-sign-in");
  const btnSignOut = $("btn-sign-out");
  const loginSection = $("login-section");

  btnSignIn.hidden = authenticated;
  btnSignOut.hidden = !authenticated;

  if (authListenersAttached) return;
  authListenersAttached = true;

  btnSignIn.addEventListener("click", () => {
    loginSection.hidden = !loginSection.hidden;
  });

  btnSignOut.addEventListener("click", async () => {
    const result = await sendMessage({ type: "LOGOUT" });
    if (result?.success) {
      window.close();
    }
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value;
    const password = $("login-password").value;
    const errorEl = $("login-error");
    errorEl.hidden = true;

    const result = await sendMessage({ type: "LOGIN", email, password });
    if (result?.success) {
      loginSection.hidden = true;
      btnSignIn.hidden = true;
      btnSignOut.hidden = false;
      init();
    } else {
      errorEl.textContent = result?.error ?? "Login failed";
      errorEl.hidden = false;
    }
  });
}

// ── URL pill ──

function renderUrl(url) {
  const el = $("site-url");
  try {
    const parsed = new URL(url);
    el.textContent = parsed.hostname + parsed.pathname.replace(/\/$/, "");
  } catch {
    el.textContent = url;
  }
  el.title = url;
}

// ── Progress ring ──

function renderProgressRing(percentage, color) {
  const wrapper = $("progress-ring-wrapper");
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "ring-svg");
  svg.setAttribute("viewBox", "0 0 110 110");

  // Background track
  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("class", "ring-track");
  track.setAttribute("cx", "55");
  track.setAttribute("cy", "55");
  track.setAttribute("r", String(radius));

  // Progress arc
  const progress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  progress.setAttribute("class", "ring-progress");
  progress.setAttribute("cx", "55");
  progress.setAttribute("cy", "55");
  progress.setAttribute("r", String(radius));
  progress.setAttribute("stroke", color);
  progress.setAttribute("stroke-dasharray", String(circumference));
  // Start fully hidden, then animate
  progress.setAttribute("stroke-dashoffset", String(circumference));

  // Percentage text
  const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  valueText.setAttribute("class", "ring-value");
  valueText.setAttribute("x", "55");
  valueText.setAttribute("y", "50");
  valueText.setAttribute("text-anchor", "middle");
  valueText.setAttribute("dominant-baseline", "central");
  valueText.textContent = percentage > 0 ? `${percentage}%` : "--";

  // "Confidence" label
  const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  labelText.setAttribute("class", "ring-label");
  labelText.setAttribute("x", "55");
  labelText.setAttribute("y", "72");
  labelText.setAttribute("text-anchor", "middle");
  labelText.textContent = "Confidence";

  svg.append(track, progress, valueText, labelText);
  wrapper.replaceChildren(svg);

  // Trigger animation after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progress.setAttribute("stroke-dashoffset", String(offset));
    });
  });
}

// ── Star rating ──

function renderStars(rating, color, mutedColor) {
  const wrapper = $("stars-wrapper");
  wrapper.replaceChildren();

  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "star-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", filled ? mutedColor : "none");
    svg.setAttribute("stroke", filled ? color : "#d4d4dc");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z");
    svg.appendChild(path);
    wrapper.appendChild(svg);
  }
}

// ── Reasons list ──

function renderReasons(reasons) {
  if (!reasons?.length) return;

  const list = $("reasons-list");
  list.replaceChildren();
  for (const item of reasons) {
    // Accept both the legacy string shape and the {text, anchor} object shape.
    const { text, anchor } =
      typeof item === "string" ? { text: item, anchor: null } : (item ?? {});
    if (!text) continue;

    const li = document.createElement("li");
    if (typeof anchor === "string" && anchor) {
      const a = document.createElement("a");
      a.href = `${_portalBase}/wiki#${anchor}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = text;
      li.appendChild(a);
    } else {
      li.textContent = text;
    }
    list.appendChild(li);
  }
  $("reasons-section").hidden = false;
}

// ── Render API assessment ──

function renderAssessment(assessment) {
  const status = assessment.safety;
  const confidence = assessment.confidence ?? 0;
  const palette = COLORS[status] ?? COLORS.safe;
  const stars = STAR_RATINGS[status] ?? 3;

  document.querySelector(".popup-card").classList.add(`status-${status}`);
  renderProgressRing(confidence, palette.ring);
  renderStars(stars, palette.star, palette.starMuted);
  renderReasons(assessment.reasons);
}

// ── Status helpers ──

function applyStatus(status, confidence) {
  const palette = COLORS[status] ?? COLORS.safe;
  const stars = STAR_RATINGS[status] ?? 3;

  document.querySelector(".popup-card").classList.add(`status-${status}`);
  renderProgressRing(confidence, palette.ring);
  renderStars(stars, palette.star, palette.starMuted);
}

// ── Email mode rendering ──

function renderEmailMode(entry) {
  const emailScan = entry.emailScan;
  const emailAssessment = entry.emailAssessment;

  // Replace URL pill with sender info
  const urlEl = $("site-url");
  if (emailScan?.sender) {
    const senderDisplay = emailScan.sender.name
      ? `${emailScan.sender.name} <${emailScan.sender.address}>`
      : emailScan.sender.address || "Unknown sender";
    urlEl.textContent = senderDisplay;
    urlEl.title = senderDisplay;
  }

  // Show subject line
  if (emailScan?.subject) {
    const subjectWrapper = $("email-subject-wrapper");
    const subjectEl = $("email-subject");
    subjectEl.textContent = emailScan.subject;
    subjectWrapper.hidden = false;
  }

  // Render assessment or fallback
  if (emailAssessment) {
    renderAssessment(emailAssessment);

    // Show suspicious links if present
    const indicators = emailAssessment.phishingIndicators;
    if (indicators?.suspiciousLinks?.length > 0) {
      renderSuspiciousLinks(indicators.suspiciousLinks);
    }
  } else if (entry.emailLoading) {
    // Still loading
    document.body.classList.add("state-loading");
  } else {
    applyStatus("suspicious", 50);
  }
}

function renderSuspiciousLinks(links) {
  const section = $("suspicious-links-section");
  const list = $("suspicious-links-list");
  const countEl = $("suspicious-links-count");
  const toggle = $("suspicious-links-toggle");

  countEl.textContent = `(${links.length})`;
  list.replaceChildren();

  for (const link of links) {
    const li = document.createElement("li");
    li.textContent = typeof link === "string" ? link : link.href || String(link);
    li.title = li.textContent;
    list.appendChild(li);
  }

  section.hidden = false;

  toggle.addEventListener("click", () => {
    list.hidden = !list.hidden;
  });
}

// ── Status / error messages ──

function showStatus(text) {
  document.querySelectorAll(".status-message").forEach((el) => el.remove());
  const wrapper = $("progress-ring-wrapper");
  const msg = document.createElement("p");
  msg.className = "status-message";
  msg.textContent = text;
  wrapper.after(msg);
}

function showError(msg) {
  document.querySelectorAll(".status-message").forEach((el) => el.remove());
  renderProgressRing(0, "#e5383b");
  const wrapper = $("progress-ring-wrapper");
  const el = document.createElement("p");
  el.className = "status-message error";
  el.textContent = msg;
  wrapper.after(el);
}

// Export for testing (no-op in browser)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { renderUrl, renderEmailMode, setupAuth, init, renderEntry, handleScanUpdate, renderSuspiciousLinks, applyStatus, renderAssessment, sendMessage, showStatus, showError, renderProgressRing, renderStars, renderReasons, loadPortalBase, DEFAULT_PORTAL_BASE };
} else {
  init();
}
