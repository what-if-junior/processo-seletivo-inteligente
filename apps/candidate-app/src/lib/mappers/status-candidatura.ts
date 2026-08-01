import { StatusCandidatura } from "@repo/types";
import type { UiBadgeStatus } from "./types";

/**
 * Maps persisted StatusCandidatura → CandidateApp badge keys.
 * Triple vocabulary (UI ≠ DB ≠ legacy PWA) — keep labels in badgeLabel.
 */
export function statusCandidaturaToBadge(
  status: StatusCandidatura | string,
): UiBadgeStatus {
  switch (status) {
    case StatusCandidatura.INSCRICAO_RECEBIDA:
      return "analise";
    case StatusCandidatura.PRE_SELECIONADO:
      return "andamento";
    case StatusCandidatura.ANALISE_DOCUMENTAL:
      return "analise";
    case StatusCandidatura.APROVADO:
    case StatusCandidatura.MATRICULADO:
      return "aprovado";
    case StatusCandidatura.REPROVADO:
      return "reprovado";
    case StatusCandidatura.CANCELADA:
      return "encerrado";
    case StatusCandidatura.DESCLASSIFICADA:
      return "reprovado";
    default:
      return "analise";
  }
}

/** Active = still in the pipeline; past = terminal result. */
export function isTerminalCandidaturaStatus(
  status: StatusCandidatura | string,
): boolean {
  return (
    status === StatusCandidatura.APROVADO ||
    status === StatusCandidatura.MATRICULADO ||
    status === StatusCandidatura.REPROVADO ||
    status === StatusCandidatura.CANCELADA ||
    status === StatusCandidatura.DESCLASSIFICADA
  );
}
