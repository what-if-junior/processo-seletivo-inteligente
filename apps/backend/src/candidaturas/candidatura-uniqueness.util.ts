import { StatusCandidatura } from '@repo/types';

/** Status that permanently block a new inscription on the same edital (REQ-2.2). */
export const BLOCKING_TERMINAL_STATUSES: StatusCandidatura[] = [
  StatusCandidatura.REPROVADO,
  StatusCandidatura.DESCLASSIFICADA,
];

/**
 * Status excluded from the partial unique index / “active” uniqueness.
 * Only `cancelada` frees the CPF×edital slot (REQ-2.2).
 */
export function isCancelada(status: StatusCandidatura | string): boolean {
  return status === StatusCandidatura.CANCELADA;
}

export function isBlockingTerminal(
  status: StatusCandidatura | string,
): boolean {
  return (
    status === StatusCandidatura.REPROVADO ||
    status === StatusCandidatura.DESCLASSIFICADA
  );
}

/** Non-cancelada rows occupy the usuario×edital slot (active or blocked). */
export function occupiesEditalSlot(
  status: StatusCandidatura | string,
): boolean {
  return !isCancelada(status);
}

export function canCandidateCancel(
  status: StatusCandidatura | string,
): boolean {
  return !isCancelada(status) && !isBlockingTerminal(status) &&
    status !== StatusCandidatura.APROVADO;
}

export const MSG_ACTIVE_DUPLICATE =
  'Já existe inscrição ativa neste edital. Cancele a inscrição atual na fase de Inscrição para escolher outro curso.';

export const MSG_BLOCKED_AFTER_TERMINAL =
  'Não é possível nova inscrição neste edital após reprovação ou desclassificação.';

export const MSG_INSCRICAO_WINDOW_CLOSED =
  'Inscrições fechadas para este edital (fora da janela efetiva de Inscrição).';

export const MSG_CANCEL_WINDOW_CLOSED =
  'Cancelamento só é permitido durante a fase de Inscrição.';

export const MSG_CANCEL_NOT_ALLOWED =
  'Esta inscrição não pode ser cancelada pelo candidato.';
