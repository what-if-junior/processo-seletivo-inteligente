import { StatusCandidatura } from "@repo/types";

/**
 * Maps candidatura status → index in the 5-step inscription timeline
 * (Inscrição → Docs → Classificação → Homologação → Matrícula).
 */
export function statusCandidaturaToInscricaoStep(
  status: StatusCandidatura | string,
): number {
  switch (status) {
    case StatusCandidatura.INSCRICAO_RECEBIDA:
      return 0;
    case StatusCandidatura.ANALISE_DOCUMENTAL:
      return 1;
    case StatusCandidatura.PRE_SELECIONADO:
      return 2;
    case StatusCandidatura.APROVADO:
      return 4;
    case StatusCandidatura.REPROVADO:
    case StatusCandidatura.CANCELADA:
    case StatusCandidatura.DESCLASSIFICADA:
      return 3;
    default:
      return 0;
  }
}

/** Wizard step 2 requires escola + cota before Continuar. */
export function wizardCotasStepReady(escola: string, cota: string): boolean {
  return Boolean(escola.trim() && cota.trim());
}
