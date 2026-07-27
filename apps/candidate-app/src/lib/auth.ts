import { apiFetch, setAccessToken } from "./api";

export type LoginPayload = {
  senha: string;
  email?: string;
  CPF?: string;
};
export type LoginResponse = { access_token: string };

export type RegisterPayload = {
  nome_completo: string;
  email: string;
  senha: string;
  CPF: string;
  data_nascimento: string;
  telefone: string;
};

/** Login with e-mail or CPF (digits/formatted) + senha. */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const body: Record<string, string> = { senha: payload.senha };
  if (payload.email?.trim()) body.email = payload.email.trim();
  if (payload.CPF?.trim()) body.CPF = payload.CPF.trim();

  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
  setAccessToken(data.access_token);
  return data;
}

export async function register(payload: RegisterPayload): Promise<unknown> {
  return apiFetch("/user", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(): void {
  setAccessToken(null);
}

/** True when the identifier looks like an e-mail rather than CPF digits. */
export function isEmailIdentifier(value: string): boolean {
  return value.includes("@");
}

/** Build login payload from a single identifier field (e-mail or CPF). */
export function loginPayloadFromIdentifier(
  identifier: string,
  senha: string,
): LoginPayload {
  const trimmed = identifier.trim();
  if (isEmailIdentifier(trimmed)) {
    return { email: trimmed, senha };
  }
  return { CPF: trimmed.replace(/\D/g, ""), senha };
}
