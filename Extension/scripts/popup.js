const $ = (id) => document.getElementById(id);

async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    showError("No active tab");
    return;
  }

  document.body.classList.add("state-loading");

  chrome.runtime.sendMessage({ type: "GET_SCAN", tabId: tab.id }, (response) => {
    document.body.classList.remove("state-loading");

    if (chrome.runtime.lastError || !response?.data) {
      showNoData();
      return;
    }

    render(response.data);
  });
}

function render(data) {
  const { url, forms, links, meta } = data;

  // HTTPS status
  const httpsVal = $("https-value");
  if (meta.isHttps) {
    httpsVal.textContent = "Secure";
    httpsVal.classList.add("secure");
    $("https-icon").textContent = "\u{1F512}"; // locked
  } else {
    httpsVal.textContent = "Not secure";
    httpsVal.classList.add("insecure");
    $("https-icon").textContent = "\u{1F513}"; // unlocked
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

  // Status label — basic heuristic for visual state
  const status = deriveStatus(meta, forms, links);
  const scoreCircle = $("score-circle");
  const statusLabel = $("status-label");

  scoreCircle.classList.add(status);
  statusLabel.classList.add(status);
  statusLabel.textContent = statusText(status);

  // Site URL
  $("site-url").textContent = url;
  $("site-url").title = url;
}

function deriveStatus(meta, forms, links) {
  const hasPassword = forms.some((f) => f.hasPasswordField);

  if (!meta.isHttps && hasPassword) return "danger";
  if (!meta.isHttps) return "suspicious";
  if (hasPassword || forms.length > 3) return "uncertain";
  return "safe";
}

function statusText(status) {
  const map = {
    safe: "Safe",
    uncertain: "Uncertain",
    suspicious: "Suspicious",
    danger: "Danger",
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
