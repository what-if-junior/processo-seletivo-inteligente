import { ApiError } from "../api";

/** Nest default JSON body shape. */
type NestErrorBody = {
  message?: string | string[];
  statusCode?: number;
  error?: string;
};

/**
 * Human-readable copy for inscrição create/cancel API failures (REQ-2.2 / W14).
 * Prefer Nest `message`; fall back to status-based defaults.
 */
export function messageFromInscricaoApiError(
  err: unknown,
  fallback = "Não foi possível concluir a operação de inscrição.",
): string {
  if (!(err instanceof ApiError)) {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }

  const body = err.body as NestErrorBody | string | null | undefined;
  let nestMessage: string | undefined;
  if (typeof body === "string" && body.trim()) {
    nestMessage = body;
  } else if (body && typeof body === "object") {
    const m = body.message;
    if (typeof m === "string" && m.trim()) nestMessage = m;
    else if (Array.isArray(m) && m.length) nestMessage = m.join(" ");
  }

  if (nestMessage) return nestMessage;

  if (err.status === 409) {
    return "Já existe inscrição ativa neste edital. Cancele a atual na fase de Inscrição para escolher outro curso.";
  }
  if (err.status === 403) {
    return "Operação bloqueada fora da janela efetiva de Inscrição.";
  }
  if (err.status === 400) {
    return "Esta inscrição não pode ser cancelada neste momento.";
  }
  return fallback;
}

/** Short must-warn copy: 1 course per edital (REQ-0.1 / 2.2 / 2.7). */
export const AVISO_UM_CURSO_POR_EDITAL =
  "Você só pode ter uma inscrição ativa por edital (um curso). Para trocar de curso, cancele a inscrição atual enquanto a fase de Inscrição estiver aberta.";
