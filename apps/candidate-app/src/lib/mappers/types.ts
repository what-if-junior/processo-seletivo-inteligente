/** UI shapes used by CandidateApp course cards and related screens. */

export type EditalCardStatus = "aberto" | "encerrado";

export type EditalCardTipo = "Técnico" | "Superior" | "Médio" | string;

export type EditalCard = {
  id: string;
  titulo: string;
  sub: string;
  campus: string;
  vagas: number;
  prazo: string;
  status: EditalCardStatus;
  tipo: EditalCardTipo;
};

/** Badge keys consumed by CandidateApp `badgeCls` / `badgeLabel`. */
export type UiBadgeStatus =
  | "aberto"
  | "analise"
  | "andamento"
  | "aprovado"
  | "reprovado"
  | "encerrado"
  | "pendente"
  | "pendente_docs"
  | "enviado"
  | "na";

export type DocUiStatus = "enviado" | "pendente" | "na";

export type DocUiRow = {
  id: string;
  nome: string;
  obrigatorio: boolean;
  status: DocUiStatus;
  tipo: "upload" | "camera";
};

export type CronogramaSt = "done" | "active" | "pending";

export type CronogramaRow = {
  data: string;
  etapa: string;
  st: CronogramaSt;
};

export type WizardCota = "ppi" | "pcd" | "renda" | "nenhuma";
