/** UI shapes used by CandidateApp course cards and related screens. */

export type EditalCardStatus = "aberto" | "encerrado";

export type EditalCardTipo = "Técnico" | "Superior" | "Médio" | string;

export type EditalCard = {
  /** UI key — prefer oferta id when from `/ofertas`. */
  id: string;
  /** Real Ofertas.id for POST /candidaturas (M-06). */
  id_oferta: number;
  /** Real Editais.id for POST /candidaturas (M-06). */
  id_edital: number;
  titulo: string;
  /** Edital pai / processo label (numero_ano). */
  editalLabel: string;
  sub: string;
  campus: string;
  id_campus?: number;
  turno: string;
  area_conhecimento: string;
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
