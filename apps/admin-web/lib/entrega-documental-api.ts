import { ModoEntrega, SubtipoEntregaOnline } from "@repo/types";
import { apiFetch } from "./api";

export type EntregaDocumental = {
  id: number;
  id_edital: number;
  id_campus: number;
  id_curso: number;
  id_cronograma_etapa: number;
  modo: ModoEntrega;
  local_nome?: string | null;
  endereco?: string | null;
  horario?: string | null;
  contactos?: string | null;
  subtipo_online?: SubtipoEntregaOnline | null;
  url_externa?: string | null;
  email_institucional?: string | null;
  instrucoes?: string | null;
  uploads_ocultos: boolean;
};

export type EntregaDocumentalListResponse = {
  configuracoes: EntregaDocumental[];
};

export type CreateEntregaDocumentalPayload = {
  id_campus: number;
  id_curso: number;
  id_cronograma_etapa: number;
  modo: ModoEntrega;
  local_nome?: string | null;
  endereco?: string | null;
  horario?: string | null;
  contactos?: string | null;
  subtipo_online?: SubtipoEntregaOnline | null;
  url_externa?: string | null;
  email_institucional?: string | null;
  instrucoes?: string | null;
};

export type UpdateEntregaDocumentalPayload =
  Partial<CreateEntregaDocumentalPayload>;

function base(editalId: number): string {
  return `/editais/${editalId}/entrega-documental`;
}

export function listEntregaDocumentalGestao(
  editalId: number,
): Promise<EntregaDocumentalListResponse> {
  return apiFetch<EntregaDocumentalListResponse>(`${base(editalId)}/gestao`);
}

export function createEntregaDocumental(
  editalId: number,
  payload: CreateEntregaDocumentalPayload,
): Promise<EntregaDocumental> {
  return apiFetch<EntregaDocumental>(base(editalId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEntregaDocumental(
  editalId: number,
  id: number,
  payload: UpdateEntregaDocumentalPayload,
): Promise<EntregaDocumental> {
  return apiFetch<EntregaDocumental>(`${base(editalId)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteEntregaDocumental(
  editalId: number,
  id: number,
): Promise<void> {
  return apiFetch<void>(`${base(editalId)}/${id}`, { method: "DELETE" });
}
