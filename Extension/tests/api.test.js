import { describe, it, expect, beforeEach, vi } from "vitest";
import { installChromeMock, resetStorage } from "./chrome-mock.js";

installChromeMock();

// Import after chrome mock is installed
const api = await import("../scripts/api.js");
const {
  login,
  logout,
  assessUrl,
  isAuthenticated,
  getToken,
  saveToken,
  clearToken,
  request,
  validateBaseUrl,
  ApiError,
} = api;

beforeEach(() => {
  resetStorage();
  vi.restoreAllMocks();
});

// --- Stub mode responses ---

describe("login (stub)", () => {
  it("returns a token and user object", async () => {
    const result = await login("test@example.com", "pw");
    expect(result).toHaveProperty("access_token");
    expect(result).toHaveProperty("refresh_token");
    expect(result).toHaveProperty("expires_in");
    expect(result.user).toHaveProperty("id");
    expect(result.user).toHaveProperty("email");
    expect(result.user).toHaveProperty("name");
  });

  it("stores the token via saveToken", async () => {
    await login("test@example.com", "pw");
    const token = await getToken();
    expect(token).toBeTruthy();
  });

  it("uses the provided email in the response", async () => {
    const result = await login("hello@world.com", "pw");
    expect(result.user.email).toBe("hello@world.com");
  });
});

describe("logout (stub)", () => {
  it("returns a message", async () => {
    await login("test@example.com", "pw");
    const result = await logout();
    expect(result).toHaveProperty("message");
  });

  it("clears the stored token", async () => {
    await login("test@example.com", "pw");
    await logout();
    const token = await getToken();
    expect(token).toBeNull();
  });
});

describe("assessUrl (stub)", () => {
  it("returns correct response shape", async () => {
    const result = await assessUrl("https://example.com", {
      forms: [],
      links: { total: 5, external: 1 },
      meta: { isHttps: true, title: "Test" },
    });

    expect(result).toHaveProperty("safety");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("reasons");
    expect(result).toHaveProperty("assessed_at");
  });

  it("returns correct types", async () => {
    const result = await assessUrl("https://example.com", {});
    expect(typeof result.safety).toBe("string");
    expect(typeof result.confidence).toBe("number");
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.assessed_at).toBe("string");
  });

  it("safety is one of the valid values", async () => {
    const result = await assessUrl("https://example.com", {});
    expect(["safe", "unsafe", "suspicious"]).toContain(result.safety);
  });

  it("confidence is between 0 and 100", async () => {
    const result = await assessUrl("https://example.com", {});
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

// --- Token management ---

describe("isAuthenticated", () => {
  it("returns false when no token stored", async () => {
    expect(await isAuthenticated()).toBe(false);
  });

  it("returns true after saving a token", async () => {
    await saveToken("some-token");
    expect(await isAuthenticated()).toBe(true);
  });

  it("returns false after clearing token", async () => {
    await saveToken("some-token");
    await clearToken();
    expect(await isAuthenticated()).toBe(false);
  });
});

// --- request() ---

describe("request", () => {
  it("attaches auth header when token exists", async () => {
    await saveToken("my-token");

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });
    globalThis.fetch = fetchSpy;

    await request("GET", "/test");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer my-token");
  });

  it("does not attach auth header when no token", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });
    globalThis.fetch = fetchSpy;

    await request("GET", "/test");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["Authorization"]).toBeUndefined();
  });

  it("throws ApiError on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ message: "Token expired" }),
    });

    await expect(request("GET", "/test")).rejects.toThrow(ApiError);

    try {
      await request("GET", "/test");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(err.message).toBe("Token expired");
    }
  });
});

// --- HTTPS enforcement ---

describe("validateBaseUrl", () => {
  it("allows HTTPS URLs", () => {
    expect(() => validateBaseUrl("https://api.example.com")).not.toThrow();
  });

  it("allows localhost HTTP", () => {
    expect(() => validateBaseUrl("http://localhost:8000")).not.toThrow();
  });

  it("allows 127.0.0.1 HTTP", () => {
    expect(() => validateBaseUrl("http://127.0.0.1:3000")).not.toThrow();
  });

  it("rejects non-HTTPS non-localhost URLs", () => {
    expect(() => validateBaseUrl("http://api.example.com")).toThrow(ApiError);
  });

  it("rejects invalid URLs", () => {
    expect(() => validateBaseUrl("not-a-url")).toThrow(ApiError);
  });
});
