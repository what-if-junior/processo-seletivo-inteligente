import { StatusCandidatura, StatusDocumento } from "@repo/types";

/** PT labels for StatusCandidatura (artefact / SQL enum). */
export const STATUS_CANDIDATURA_LABELS: Record<StatusCandidatura, string> = {
  [StatusCandidatura.INSCRICAO_RECEBIDA]: "Inscrição Recebida",
  [StatusCandidatura.PRE_SELECIONADO]: "Pré-selecionado",
  [StatusCandidatura.ANALISE_DOCUMENTAL]: "Em Análise",
  [StatusCandidatura.APROVADO]: "Aprovado",
  [StatusCandidatura.REPROVADO]: "Rejeitado",
};

/** Prototype-friendly bucket for KPI cards. */
export type StatusBucket =
  | "em_analise"
  | "aprovada"
  | "rejeitada"
  | "outros";

export function statusLabel(status: string): string {
  if (status in STATUS_CANDIDATURA_LABELS) {
    return STATUS_CANDIDATURA_LABELS[status as StatusCandidatura];
  }
  if (status === "cancelada") return "Cancelada";
  return status;
}

export function statusBucket(status: string): StatusBucket {
  switch (status) {
    case StatusCandidatura.APROVADO:
      return "aprovada";
    case StatusCandidatura.REPROVADO:
      return "rejeitada";
    case StatusCandidatura.ANALISE_DOCUMENTAL:
    case StatusCandidatura.INSCRICAO_RECEBIDA:
    case StatusCandidatura.PRE_SELECIONADO:
      return "em_analise";
    default:
      return "outros";
  }
}

export type BadgeTone = "green" | "yellow" | "red" | "gray" | "blue";

export function statusTone(status: string): BadgeTone {
  switch (statusBucket(status)) {
    case "aprovada":
      return "green";
    case "rejeitada":
      return "red";
    case "em_analise":
      return "yellow";
    default:
      return "gray";
  }
}

export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os Status" },
  ...Object.values(StatusCandidatura).map((value) => ({
    value,
    label: STATUS_CANDIDATURA_LABELS[value],
  })),
];

/** Admin action → target StatusCandidatura (UI only until PATCH exists). */
export const ADMIN_STATUS_ACTIONS = [
  {
    key: "aprovar" as const,
    label: "Aprovar",
    target: StatusCandidatura.APROVADO,
    tone: "green" as const,
  },
  {
    key: "rejeitar" as const,
    label: "Rejeitar",
    target: StatusCandidatura.REPROVADO,
    tone: "red" as const,
  },
  {
    key: "revisao" as const,
    label: "Marcar em Revisão",
    target: StatusCandidatura.ANALISE_DOCUMENTAL,
    tone: "yellow" as const,
  },
];

export const STATUS_DOCUMENTO_LABELS: Record<string, string> = {
  [StatusDocumento.EM_ANALISE]: "Em análise",
  [StatusDocumento.APROVADO]: "Homologado",
  [StatusDocumento.REPROVADO]: "Rejeitado",
  [StatusDocumento.REVISAO_MANUAL]: "Revisão manual",
};
