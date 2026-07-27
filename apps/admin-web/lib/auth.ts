import { apiFetch, setAccessToken } from "./api";

export type LoginPayload = { email: string; senha: string };
export type LoginResponse = { access_token: string };

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAccessToken(data.access_token);
  return data;
}

export function logout(): void {
  setAccessToken(null);
}
