import {
  EtapaStatusOverride,
  TipoEtapaCronograma,
} from "@repo/types";
import { apiFetch } from "./api";

export type CronogramaWarning = {
  code: string;
  message: string;
  etapa_ids?: number[];
};

export type CronogramaEtapa = {
  id: number;
  id_edital: number;
  tipo: TipoEtapaCronograma;
  nome_exibido: string;
  data_inicio: string;
  data_fim: string;
  descricao?: string | null;
  ordem: number;
  override: EtapaStatusOverride;
  elegivel_impugnacao: boolean;
  elegivel_recurso: boolean;
  template_instrucao_id?: number | null;
};

export type CronogramaListResponse = {
  etapas: CronogramaEtapa[];
  warnings: CronogramaWarning[];
  janela_inscricao: {
    aberta: boolean;
    etapa: CronogramaEtapa | null;
  };
};

export type CreateCronogramaPayload = {
  tipo: TipoEtapaCronograma;
  nome_exibido?: string;
  data_inicio: string;
  data_fim: string;
  descricao?: string | null;
  ordem?: number;
  override?: EtapaStatusOverride;
  elegivel_impugnacao?: boolean;
  elegivel_recurso?: boolean;
  template_instrucao_id?: number | null;
};

export type UpdateCronogramaPayload = Partial<CreateCronogramaPayload>;

function base(editalId: number): string {
  return `/editais/${editalId}/cronograma`;
}

export function listCronogramaGestao(
  editalId: number,
): Promise<CronogramaListResponse> {
  return apiFetch<CronogramaListResponse>(`${base(editalId)}/gestao`);
}

export function createCronogramaEtapa(
  editalId: number,
  payload: CreateCronogramaPayload,
): Promise<CronogramaEtapa> {
  return apiFetch<CronogramaEtapa>(base(editalId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCronogramaEtapa(
  editalId: number,
  id: number,
  payload: UpdateCronogramaPayload,
): Promise<CronogramaEtapa> {
  return apiFetch<CronogramaEtapa>(`${base(editalId)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCronogramaEtapa(
  editalId: number,
  id: number,
): Promise<void> {
  return apiFetch<void>(`${base(editalId)}/${id}`, { method: "DELETE" });
}

export function reorderCronograma(
  editalId: number,
  ids: number[],
): Promise<CronogramaListResponse> {
  return apiFetch<CronogramaListResponse>(`${base(editalId)}/ordem`, {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString();
}
