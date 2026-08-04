import { StatusCandidatura } from '@repo/types';

/** Candidaturas that still participate in the edital funnel (notify cohort). */
export const STATUS_COORTE_ATIVA: StatusCandidatura[] = [
  StatusCandidatura.INSCRICAO_RECEBIDA,
  StatusCandidatura.PRE_SELECIONADO,
  StatusCandidatura.ANALISE_DOCUMENTAL,
  StatusCandidatura.APROVADO,
];

/** Cohort for matrícula due reminders (approved / pré-selecionados). */
export const STATUS_COORTE_MATRICULA: StatusCandidatura[] = [
  StatusCandidatura.APROVADO,
  StatusCandidatura.PRE_SELECIONADO,
];

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function buildDisparoChave(
  idLembrete: number,
  idEtapa: number,
  idUsuario: number,
  windowIso: string,
): string {
  return `${idLembrete}:${idEtapa}:${idUsuario}:${windowIso}`;
}
