const $ = (id) => document.getElementById(id);

async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    showError("No active tab");
    return;
  }

  document.body.classList.add("state-loading");

  // Fetch auth state and scan data in parallel
  const [authState, scanResponse] = await Promise.all([
    sendMessage({ type: "GET_AUTH_STATE" }),
    sendMessage({ type: "GET_SCAN", tabId: tab.id }),
  ]);

  document.body.classList.remove("state-loading");

  setupAuth(authState?.authenticated ?? false);

  if (!scanResponse?.data) {
    showNoData();
    return;
  }

  const entry = scanResponse.data;
  renderScanDetails(entry.scan);

  if (entry.assessment) {
    renderAssessment(entry.assessment);
  } else {
    // No API assessment — use local heuristic
    const status = deriveStatus(entry.scan.meta, entry.scan.forms, entry.scan.links);
    applyStatus(status);
  }
}

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

// --- Auth UI ---

function setupAuth(authenticated) {
  const btnSignIn = $("btn-sign-in");
  const btnSignOut = $("btn-sign-out");
  const loginSection = $("login-section");

  if (authenticated) {
    btnSignIn.hidden = true;
    btnSignOut.hidden = false;
  } else {
    btnSignIn.hidden = false;
    btnSignOut.hidden = true;
  }

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
      $("auth-user").textContent = result.user?.email ?? email;
      loginSection.hidden = true;
      btnSignIn.hidden = true;
      btnSignOut.hidden = false;
      // Re-init to fetch assessment now that we're authed
      init();
    } else {
      errorEl.textContent = result?.error ?? "Login failed";
      errorEl.hidden = false;
    }
  });
}

// --- Render scan details ---

function renderScanDetails(data) {
  const { url, forms, links, meta } = data;

  // HTTPS status
  const httpsVal = $("https-value");
  if (meta.isHttps) {
    httpsVal.textContent = "Secure";
    httpsVal.classList.add("secure");
    $("https-icon").textContent = "\u{1F512}";
  } else {
    httpsVal.textContent = "Not secure";
    httpsVal.classList.add("insecure");
    $("https-icon").textContent = "\u{1F513}";
  }

  // Forms
  $("forms-value").textContent = forms.length;
  if (forms.length > 0) {
    $("forms-value").classList.add("warn");
  }

  // Links
  $("links-value").textContent = `${links.total} (${links.external} external)`;

  // Password fields
  const passwordCount = forms.reduce(
    (sum, f) => sum + (f.hasPasswordField ? 1 : 0),
    0
  );
  const pwVal = $("passwords-value");
  pwVal.textContent = passwordCount;
  if (passwordCount > 0) {
    pwVal.classList.add("warn");
  }

  // Site URL
  $("site-url").textContent = url;
  $("site-url").title = url;
}

// --- Render API assessment ---

function renderAssessment(assessment) {
  applyStatus(assessment.safety);

  // Show confidence score
  $("score-value").textContent = assessment.confidence;

  // Show reasons
  if (assessment.reasons?.length) {
    const reasonsList = $("reasons-list");
    reasonsList.replaceChildren();
    for (const reason of assessment.reasons) {
      const li = document.createElement("li");
      li.textContent = reason;
      reasonsList.appendChild(li);
    }
    $("reasons-section").hidden = false;
  }
}

// --- Status helpers ---

function applyStatus(status) {
  const scoreCircle = $("score-circle");
  const statusLabel = $("status-label");

  scoreCircle.classList.add(status);
  statusLabel.classList.add(status);
  statusLabel.textContent = statusText(status);
}

function deriveStatus(meta, forms, links) {
  const hasPassword = forms.some((f) => f.hasPasswordField);

  if (!meta.isHttps && hasPassword) return "unsafe";
  if (!meta.isHttps) return "suspicious";
  if (hasPassword || forms.length > 3) return "suspicious";
  return "safe";
}

function statusText(status) {
  const map = {
    safe: "Safe",
    suspicious: "Suspicious",
    unsafe: "Unsafe",
  };
  return map[status] ?? status;
}

function showNoData() {
  $("status-label").textContent = "No data yet";
}

function showError(msg) {
  $("status-label").textContent = msg;
  $("status-label").classList.add("state-error");
}

init();
