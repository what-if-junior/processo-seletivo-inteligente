import type { Usuario } from "@repo/types";
import { apiFetch, getAccessToken } from "./api";

export type JwtPayload = {
  sub: number;
  email: string;
};

/** Demo persona when logged out (STAY_MOCK). */
export const MOCK_PROFILE = {
  nome: "João da Silva",
  firstName: "João",
  nome_completo: "João da Silva",
  CPF: "00000000012",
  cpfMasked: "CPF: ***.***.***-12",
};

/** Force mock constants even when the API is reachable. */
export function shouldUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "1";
}

/** Decode JWT payload without verification (API still validates). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { sub?: unknown; email?: unknown };
    const sub = Number(json.sub);
    if (!Number.isFinite(sub)) return null;
    return { sub, email: String(json.email ?? "") };
  } catch {
    return null;
  }
}

export function getTokenPayload(): JwtPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwtPayload(token);
}

export function getSessionUserId(): number | null {
  return getTokenPayload()?.sub ?? null;
}

export async function fetchCurrentUser(): Promise<Usuario | null> {
  if (shouldUseMocks()) return null;
  const id = getSessionUserId();
  if (id == null) return null;
  try {
    return await apiFetch<Usuario>(`/user/${id}`);
  } catch {
    return null;
  }
}

export function maskCpf(cpf: string | undefined | null): string {
  const digits = (cpf ?? "").replace(/\D/g, "");
  if (digits.length < 2) return "CPF: ***.***.***-**";
  return `CPF: ***.***.***-${digits.slice(-2)}`;
}

export function firstNameFrom(nomeCompleto: string): string {
  const part = nomeCompleto.trim().split(/\s+/)[0];
  return part || "Candidato";
}
