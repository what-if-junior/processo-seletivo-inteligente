const TOKEN_KEY = "psi.admin.access_token";
const AUTH_FLAG = "psi.admin.authenticated";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:5005"
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5005";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${AUTH_FLAG}=1; path=/; SameSite=Lax`;
  } else {
    window.sessionStorage.removeItem(TOKEN_KEY);
    document.cookie = `${AUTH_FLAG}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function isAuthenticatedClient(): boolean {
  return Boolean(getAccessToken());
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function apiMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const top = body as { code?: unknown; message?: unknown };
  const msg = top.message;
  if (typeof msg === "string") {
    return typeof top.code === "string" ? `${top.code}: ${msg}` : msg;
  }
  if (Array.isArray(msg)) return msg.map(String).join("; ");
  // Nest ConflictException({ code, message }) → message is a nested object
  if (msg && typeof msg === "object" && !Array.isArray(msg)) {
    const nested = msg as { code?: unknown; message?: unknown };
    if (typeof nested.message === "string") {
      const code =
        typeof nested.code === "string"
          ? nested.code
          : typeof top.code === "string"
            ? top.code
            : null;
      return code ? `${code}: ${nested.message}` : nested.message;
    }
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const detail = apiMessageFromBody(body);
    throw new ApiError(
      res.status,
      detail ?? `API ${res.status} ${path}`,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Multipart upload (do not set JSON Content-Type). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: formData });
}

/** Binary/text download (CSV export). */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBaseUrl()}${path}`, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status} ${path}`);
  }
  return res.blob();
}
