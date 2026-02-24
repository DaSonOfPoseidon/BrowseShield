// BrowseShield API Client
// All backend communication goes through this module.

const API_BASE = "https://api.browseshield.dev/v1";

// When true, endpoint functions return mock data instead of making real requests.
const USE_STUBS = true;

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

export async function saveToken(token) {
  await chrome.storage.local.set({ auth_token: token });
}

export async function clearToken() {
  await chrome.storage.local.remove("auth_token");
}

// --- Base request ---

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

export async function request(method, path, body) {
  validateBaseUrl(API_BASE);

  const token = await getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);

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
      "Page contains a login form",
      "Multiple external links detected",
    ],
    assessed_at: new Date().toISOString(),
  },
};

// --- Endpoint functions ---

export async function login(email, password) {
  if (USE_STUBS) {
    const data = { ...STUBS.login, user: { ...STUBS.login.user, email } };
    await saveToken(data.access_token);
    return data;
  }
  const data = await request("POST", "/auth/login", { email, password });
  await saveToken(data.access_token);
  return data;
}

export async function logout() {
  if (USE_STUBS) {
    await clearToken();
    return { ...STUBS.logout };
  }
  try {
    const data = await request("POST", "/auth/logout");
    return data;
  } finally {
    await clearToken();
  }
}

export async function assessUrl(url, scanData) {
  if (USE_STUBS) {
    return { ...STUBS.assess, assessed_at: new Date().toISOString() };
  }
  return request("POST", "/assess", { url, scan_data: scanData });
}

export async function isAuthenticated() {
  const token = await getToken();
  return token !== null;
}
