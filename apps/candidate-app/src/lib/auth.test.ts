import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getAccessToken, setAccessToken } from "./api";
import { login, logout } from "./auth";

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("sends bearer token when present", async () => {
    setAccessToken("tok");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/candidaturas");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/candidaturas"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const headers = call![1]!.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok");
  });

  it("throws ApiError on non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "unauthorized" }),
      }),
    );
    await expect(apiFetch("/candidaturas")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("auth", () => {
  it("stores access token after login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "abc" }),
      }),
    );
    await login({ email: "a@b.com", senha: "secret" });
    expect(getAccessToken()).toBe("abc");
    logout();
    expect(getAccessToken()).toBeNull();
  });
});
