import { apiFetch, getAccessToken, getApiBaseUrl } from "./api";

export type ContestacaoRow = {
  id: number;
  tipo: string;
  status: string;
  id_edital?: number | null;
  id_usuario?: number | null;
  id_candidatura?: number | null;
  texto: string;
  nome_anexo?: string | null;
  nome_requerente?: string | null;
  email_requerente?: string | null;
  criado_em: string;
  historico?: Array<{
    id: number;
    canal: string;
    corpo: string;
    enviado_em: string;
    id_template_edital?: number | null;
  }>;
};

export function listContestacoes(params: {
  edital?: number;
  tipo?: string;
  status?: string;
}): Promise<ContestacaoRow[]> {
  const qs = new URLSearchParams();
  if (params.edital) qs.set("edital", String(params.edital));
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.status) qs.set("status", params.status);
  const q = qs.toString();
  return apiFetch<ContestacaoRow[]>(`/contestacoes${q ? `?${q}` : ""}`);
}

export function getContestacao(id: number): Promise<ContestacaoRow> {
  return apiFetch<ContestacaoRow>(`/contestacoes/${id}`);
}

export function patchContestacaoStatus(
  id: number,
  status: string,
): Promise<ContestacaoRow> {
  return apiFetch<ContestacaoRow>(`/contestacoes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function responderContestacao(
  id: number,
  body: {
    corpo: string;
    canais: ("email" | "pwa")[];
    id_template_edital?: number;
    status?: string;
  },
): Promise<ContestacaoRow & { historico_criado?: unknown[] }> {
  return apiFetch(`/contestacoes/${id}/responder`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function downloadContestacaoAnexo(id: number): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBaseUrl()}/contestacoes/${id}/anexo`, {
    headers,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
