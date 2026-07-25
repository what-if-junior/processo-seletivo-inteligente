import { apiFetch, setAccessToken } from "./api";

export type LoginPayload = { email: string; senha: string };
export type LoginResponse = { access_token: string };

export type RegisterPayload = {
  nome_completo: string;
  email: string;
  senha: string;
  CPF: string;
  data_nascimento: string;
  telefone: string;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
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
