import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getAccessToken, setAccessToken } from "./api";
import { login, logout, loginPayloadFromIdentifier, isEmailIdentifier } from "./auth";

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
    const headers = call![1].headers as Headers;
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

  it("sends CPF when identifier is digits", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "cpf-tok" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await login(loginPayloadFromIdentifier("123.456.789-00", "senha123"));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      CPF?: string;
      email?: string;
    };
    expect(body.CPF).toBe("12345678900");
    expect(body.email).toBeUndefined();
    expect(getAccessToken()).toBe("cpf-tok");
  });

  it("detects email vs CPF identifiers", () => {
    expect(isEmailIdentifier("joao@teste.com")).toBe(true);
    expect(isEmailIdentifier("12345678900")).toBe(false);
    expect(loginPayloadFromIdentifier("joao@teste.com", "x")).toEqual({
      email: "joao@teste.com",
      senha: "x",
    });
  });
});
