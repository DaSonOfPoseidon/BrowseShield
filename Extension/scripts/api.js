// BrowseShield API Client
// All backend communication goes through this module.

const DEFAULT_API_BASE = "https://api.browseshield.dev/v1";
export const DEFAULT_PORTAL_BASE = "https://browseshield.dev";

// When true, endpoint functions return mock data instead of making real requests.
let USE_STUBS = false;

export function _setUseStubs(value) {
  USE_STUBS = Boolean(value);
}

// Resolved at call time — use getApiBase() instead of API_BASE directly.
let _cachedApiBase = null;

async function getApiBase() {
  if (_cachedApiBase) return _cachedApiBase;
  try {
    const { api_base_url } = await chrome.storage.local.get("api_base_url");
    _cachedApiBase = api_base_url || DEFAULT_API_BASE;
  } catch {
    _cachedApiBase = DEFAULT_API_BASE;
  }
  return _cachedApiBase;
}

// Allow re-reading storage (e.g. after settings change)
export function clearApiBaseCache() {
  _cachedApiBase = null;
}

// Resolved at call time — use getPortalBase() instead of a constant.
let _cachedPortalBase = null;

export async function getPortalBase() {
  if (_cachedPortalBase) return _cachedPortalBase;
  try {
    const { portal_base_url } = await chrome.storage.local.get("portal_base_url");
    _cachedPortalBase = portal_base_url || DEFAULT_PORTAL_BASE;
  } catch {
    _cachedPortalBase = DEFAULT_PORTAL_BASE;
  }
  return _cachedPortalBase;
}

export function clearPortalBaseCache() {
  _cachedPortalBase = null;
}

// --- ApiError ---

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --- Token helpers ---

export async function getToken() {
  const result = await chrome.storage.local.get("auth_token");
  return result.auth_token ?? null;
}

export async function saveToken(data) {
  await chrome.storage.local.set({
    auth_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  });
}

export async function clearToken() {
  await chrome.storage.local.remove(["auth_token", "refresh_token", "expires_at"]);
}

// --- URL validation ---

export function validateBaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return;
    throw new ApiError("API base URL must use HTTPS (non-localhost)", 0);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(`Invalid API base URL: ${url}`, 0);
  }
}

// --- Constants ---

const REQUEST_TIMEOUT_MS = 15000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// --- Token refresh ---

async function isTokenExpiringSoon() {
  const { expires_at } = await chrome.storage.local.get("expires_at");
  if (!expires_at) return false;
  return Date.now() >= expires_at - REFRESH_BUFFER_MS;
}

export async function getTokenExpiry() {
  const { expires_at } = await chrome.storage.local.get("expires_at");
  return expires_at ?? null;
}

// Mutex: deduplicate concurrent refresh calls
let _refreshPromise = null;

export function _resetRefreshPromise() {
  _refreshPromise = null;
}

export async function refreshAccessToken() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = _doRefresh();
  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}

async function _doRefresh() {
  const { refresh_token } = await chrome.storage.local.get("refresh_token");
  if (!refresh_token) throw new ApiError("No refresh token", 401);

  const apiBase = await getApiBase();
  validateBaseUrl(apiBase);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new ApiError("Token refresh failed", response.status);
    }

    const data = await response.json();
    await saveToken(data);
    return data;
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof ApiError) throw e;
    if (e.name === "AbortError") throw new ApiError("Token refresh timed out", 0);
    throw e;
  }
}

// --- Base request ---

export async function request(method, path, body, _retried = false) {
  const apiBase = await getApiBase();
  validateBaseUrl(apiBase);

  // Auto-refresh if token is near expiry
  if (!_retried && await isTokenExpiringSoon()) {
    try { await refreshAccessToken(); } catch { /* proceed with current token */ }
  }

  const token = await getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  options.signal = controller.signal;

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, options);
    clearTimeout(timeout);
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new ApiError("Request timed out", 0);
    throw e;
  }

  // 401 retry: attempt refresh once, then retry the request
  if (response.status === 401 && !_retried) {
    try {
      await refreshAccessToken();
      return request(method, path, body, true);
    } catch {
      // refresh failed — fall through to throw below
    }
  }

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch {
      // use statusText
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
}

// --- Stub responses ---

const STUBS = {
  login: {
    access_token: "stub-token-abc123",
    refresh_token: "stub-refresh-xyz",
    expires_in: 3600,
    user: { id: "user-1", email: "user@example.com", name: "Test User" },
  },
  logout: { message: "Logged out" },
  assess: {
    safety: "suspicious",
    confidence: 72,
    reasons: [
      { text: "Page contains a login form", anchor: "login-form" },
      { text: "Multiple external links detected", anchor: "external-resources" },
    ],
    assessed_at: new Date().toISOString(),
  },
  assessEmail: {
    safety: "suspicious",
    confidence: 65,
    reasons: [
      { text: "Sender domain does not match display name", anchor: null },
      { text: "Email contains urgency language", anchor: null },
      { text: "Link text does not match destination URL", anchor: null },
    ],
    phishingIndicators: {
      senderMismatch: true,
      suspiciousLinks: ["https://evil-site.example.com/login"],
      urgencyLanguage: true,
      suspiciousAttachments: false,
    },
    assessed_at: new Date().toISOString(),
  },
};

// --- Response validators ---

function validateLoginResponse(data) {
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new ApiError("Invalid login response: missing access_token", 0);
  }
  if (typeof data.expires_in !== "number" || data.expires_in <= 0) {
    throw new ApiError("Invalid login response: missing expires_in", 0);
  }
  return data;
}

function validateAssessResponse(data) {
  if (!["safe", "unsafe", "suspicious"].includes(data.safety)) {
    throw new ApiError("Invalid safety value in response", 0);
  }
  if (typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 100) {
    throw new ApiError("Invalid confidence value in response", 0);
  }
  return data;
}

function validateEmailAssessResponse(data) {
  validateAssessResponse(data);
  if (data.phishingIndicators && typeof data.phishingIndicators !== "object") {
    throw new ApiError("Invalid phishingIndicators in response", 0);
  }
  return data;
}

// --- Endpoint functions ---

export async function login(email, password) {
  if (USE_STUBS) {
    const data = { ...STUBS.login, user: { ...STUBS.login.user, email } };
    validateLoginResponse(data);
    await saveToken(data);
    return data;
  }
  const data = await request("POST", "/auth/login", { email, password });
  validateLoginResponse(data);
  await saveToken(data);
  return data;
}

export async function logout() {
  if (USE_STUBS) {
    await clearToken();
    return { ...STUBS.logout };
  }
  try {
    const { refresh_token } = await chrome.storage.local.get("refresh_token");
    const data = await request("POST", "/auth/logout", { refresh_token });
    return data;
  } finally {
    await clearToken();
  }
}

export async function assessUrl(url, scanData) {
  if (USE_STUBS) {
    const result = { ...STUBS.assess, assessed_at: new Date().toISOString() };
    validateAssessResponse(result);
    return result;
  }
  const data = await request("POST", "/assess", { url, scan_data: scanData });
  validateAssessResponse(data);
  return data;
}

export async function assessEmail(emailData) {
  if (USE_STUBS) {
    const result = { ...STUBS.assessEmail, assessed_at: new Date().toISOString() };
    validateEmailAssessResponse(result);
    return result;
  }
  const data = await request("POST", "/assess/email", {
    sender: emailData.sender,
    subject: emailData.subject,
    body_text: emailData.bodyText,
    links: emailData.links,
    attachments: emailData.attachments,
  });
  validateEmailAssessResponse(data);
  return data;
}

export async function isAuthenticated() {
  const token = await getToken();
  if (token === null) return false;
  const { expires_at } = await chrome.storage.local.get("expires_at");
  if (expires_at && Date.now() >= expires_at) return false;
  return true;
}
