import type {
  CampusRef,
  Cursos,
  DistribuicaoCota,
  Edital,
  EditalArquivoMeta,
  MetodoSelecao,
  MeritoTipo,
  Oferta,
  TermosModo,
  TurnoOferta,
} from "@repo/types";
import { apiFetch, apiUpload } from "./api";

export type OfertaWarning = {
  code: string;
  message: string;
  vagas_totais: number;
  soma_vagas_efetivas?: number;
  soma_percentual?: number;
};

export type OfertaGestao = Oferta & { warnings?: OfertaWarning[] };

export type CreateEditalPayload = {
  numero_ano: string;
  metodo_selecao: MetodoSelecao;
  merito_tipo?: MeritoTipo | null;
  is_simplificado?: boolean;
  fallback_ac_para_rv?: boolean;
  termos_modo: TermosModo;
  termos_valor: string;
  link_oficial?: string | null;
  /** REQ-1.5: omit = all active; [] = none; list = subset */
  tipos_base_ids?: number[] | null;
};

export type UpdateEditalPayload = Partial<CreateEditalPayload> & {
  publicado?: boolean;
  inscricoes_abertas?: boolean;
  notificar_candidatos?: boolean;
};

export type CreateOfertaPayload = {
  id_edital: number;
  id_curso: number;
  id_campus: number;
  turno: TurnoOferta;
  vagas_totais: number;
};

export type UpdateOfertaPayload = Partial<
  Omit<CreateOfertaPayload, "id_edital">
> & {
  id_edital?: number;
};

export type CotaPayload = {
  tipo_cota: string;
  vagas?: number | null;
  percentual?: number | null;
};

export function listEditaisGestao(): Promise<Edital[]> {
  return apiFetch<Edital[]>("/editais/gestao");
}

export function getEditalGestao(id: number): Promise<Edital> {
  return apiFetch<Edital>(`/editais/gestao/${id}`);
}

export function createEdital(payload: CreateEditalPayload): Promise<Edital> {
  return apiFetch<Edital>("/editais", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEdital(
  id: number,
  payload: UpdateEditalPayload,
): Promise<Edital> {
  return apiFetch<Edital>(`/editais/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listEditalArquivos(
  id: number,
): Promise<EditalArquivoMeta[]> {
  return apiFetch<EditalArquivoMeta[]>(`/editais/${id}/arquivos`);
}

export function uploadEditalPdf(
  id: number,
  file: File,
): Promise<EditalArquivoMeta> {
  const form = new FormData();
  form.append("arquivo", file);
  return apiUpload<EditalArquivoMeta>(`/editais/${id}/arquivos`, form);
}

export function listOfertasGestao(idEdital: number): Promise<OfertaGestao[]> {
  return apiFetch<OfertaGestao[]>(
    `/ofertas/gestao?id_edital=${encodeURIComponent(String(idEdital))}`,
  );
}

export function getOfertaGestao(id: number): Promise<OfertaGestao> {
  return apiFetch<OfertaGestao>(`/ofertas/gestao/${id}`);
}

export function createOferta(
  payload: CreateOfertaPayload,
): Promise<OfertaGestao> {
  return apiFetch<OfertaGestao>("/ofertas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOferta(
  id: number,
  payload: UpdateOfertaPayload,
): Promise<OfertaGestao> {
  return apiFetch<OfertaGestao>(`/ofertas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteOferta(id: number): Promise<void> {
  return apiFetch<void>(`/ofertas/${id}`, { method: "DELETE" });
}

export function replaceOfertaCotas(
  id: number,
  cotas: CotaPayload[],
): Promise<OfertaGestao> {
  return apiFetch<OfertaGestao>(`/ofertas/${id}/cotas`, {
    method: "PUT",
    body: JSON.stringify({ cotas }),
  });
}

export function listCursosCatalog(): Promise<Cursos[]> {
  return apiFetch<Cursos[]>("/cursos");
}

export function listCampusCatalog(): Promise<CampusRef[]> {
  return apiFetch<CampusRef[]>("/campus");
}

export function cotasFromOferta(
  oferta: OfertaGestao | null | undefined,
): DistribuicaoCota[] {
  return oferta?.distribuicao_cotas ?? [];
}
