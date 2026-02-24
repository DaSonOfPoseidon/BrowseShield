const $ = (id) => document.getElementById(id);

const CIRCUMFERENCE = 314.16; // 2 * π * 50

// ── Messaging ──

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

// ── Ring Animation ──

function setRingProgress(confidence) {
  const el = $("ring-progress");
  // Reset to full offset so transition plays from zero
  el.style.strokeDashoffset = CIRCUMFERENCE;
  // Force reflow to ensure the reset is painted before the transition
  el.getBoundingClientRect();
  const offset = CIRCUMFERENCE * (1 - confidence / 100);
  el.style.strokeDashoffset = offset;
}

// ── Stars ──

function renderStars(count) {
  const container = $("stars");
  container.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z");
    path.setAttribute("class", i < count ? "star-filled" : "star-empty");
    svg.appendChild(path);
    container.appendChild(svg);
  }
}

function confidenceToStars(confidence) {
  return Math.max(1, Math.min(5, Math.ceil(confidence / 20)));
}

function statusToStars(status) {
  const map = { safe: 4, suspicious: 3, unsafe: 1 };
  return map[status] ?? 3;
}

// ── Reasons ──

function generateLocalReasons(scan) {
  const reasons = [];
  const { meta, forms, links } = scan;

  // HTTPS
  if (meta.isHttps) {
    reasons.push("Secure HTTPS connection");
  } else {
    reasons.push("Connection is not encrypted (HTTP)");
  }

  // Forms
  if (forms.length === 0) {
    reasons.push("No forms detected");
  } else {
    reasons.push(`${forms.length} form${forms.length > 1 ? "s" : ""} found on page`);
  }

  // Password fields
  const pwCount = forms.reduce((sum, f) => sum + (f.hasPasswordField ? 1 : 0), 0);
  if (pwCount > 0) {
    reasons.push(`${pwCount} password field${pwCount > 1 ? "s" : ""} detected`);
  } else {
    reasons.push("No password fields detected");
  }

  // External links
  if (links.external > 0) {
    reasons.push(`${links.external} external link${links.external > 1 ? "s" : ""} detected`);
  }

  return reasons;
}

// ── Helpers ──

function deriveStatus(meta, forms, links) {
  const hasPassword = forms.some((f) => f.hasPasswordField);
  if (!meta.isHttps && hasPassword) return "unsafe";
  if (!meta.isHttps) return "suspicious";
  if (hasPassword || forms.length > 3) return "suspicious";
  return "safe";
}

function deriveConfidence(status) {
  const map = { safe: 85, suspicious: 50, unsafe: 20 };
  return map[status] ?? 50;
}

function formatUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Render ──

function renderResult(entry) {
  const { scan, assessment } = entry;
  let status, confidence, reasons;

  if (assessment) {
    status = assessment.safety;
    confidence = assessment.confidence;
    reasons = assessment.reasons ?? [];
  } else {
    status = deriveStatus(scan.meta, scan.forms, scan.links);
    confidence = deriveConfidence(status);
    reasons = generateLocalReasons(scan);
  }

  // Theme
  document.body.dataset.status = status;

  // Score
  $("score-value").textContent = confidence;
  $("score-value").className = "ring-score";

  // Ring
  setRingProgress(confidence);

  // Stars
  const starCount = assessment ? confidenceToStars(confidence) : statusToStars(status);
  renderStars(starCount);

  // Reasons
  const list = $("reasons-list");
  list.replaceChildren();
  for (const reason of reasons) {
    const li = document.createElement("li");
    li.textContent = reason;
    list.appendChild(li);
  }

  // Footer URL
  $("site-url").textContent = formatUrl(scan.url);
  $("site-url").title = scan.url;
}

// ── Auth Overlay ──

function setupAuth(authenticated) {
  const overlay = $("auth-overlay");
  const statusEl = $("auth-status");
  const form = $("login-form");

  // Gear opens overlay
  $("settings-btn").addEventListener("click", () => {
    overlay.classList.add("open");
  });

  // Close button
  $("auth-close").addEventListener("click", () => {
    overlay.classList.remove("open");
  });

  // Backdrop click closes
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("open");
    }
  });

  if (authenticated) {
    statusEl.classList.add("visible");
    form.classList.add("hidden");
  } else {
    statusEl.classList.remove("visible");
    form.classList.remove("hidden");
  }

  // Sign out
  $("auth-signout").addEventListener("click", async () => {
    const result = await sendMessage({ type: "LOGOUT" });
    if (result?.success) {
      overlay.classList.remove("open");
      statusEl.classList.remove("visible");
      form.classList.remove("hidden");
      init();
    }
  });

  // Login submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value;
    const password = $("login-password").value;
    const errorEl = $("login-error");
    errorEl.classList.remove("visible");

    const result = await sendMessage({ type: "LOGIN", email, password });
    if (result?.success) {
      $("auth-email").textContent = result.user?.email ?? email;
      statusEl.classList.add("visible");
      form.classList.add("hidden");
      overlay.classList.remove("open");
      init();
    } else {
      errorEl.textContent = result?.error ?? "Login failed";
      errorEl.classList.add("visible");
    }
  });
}

// ── States ──

function showLoading() {
  document.body.dataset.status = "loading";
  $("score-value").textContent = "--";
  $("score-value").className = "ring-score";
  renderStars(0);
  $("reasons-list").replaceChildren();
}

function showNoData() {
  document.body.dataset.status = "loading";
  $("score-value").textContent = "No data";
  $("score-value").className = "ring-score nodata";
}

function showError(msg) {
  document.body.dataset.status = "loading";
  $("score-value").textContent = msg;
  $("score-value").className = "ring-score error";
}

// ── Init ──

async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    showError("No active tab");
    return;
  }

  showLoading();

  const [authState, scanResponse] = await Promise.all([
    sendMessage({ type: "GET_AUTH_STATE" }),
    sendMessage({ type: "GET_SCAN", tabId: tab.id }),
  ]);

  setupAuth(authState?.authenticated ?? false);

  if (!scanResponse?.data) {
    showNoData();
    return;
  }

  renderResult(scanResponse.data);
}

init();
