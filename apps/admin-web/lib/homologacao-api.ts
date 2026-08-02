import { apiFetch, getApiBaseUrl, getAccessToken } from "./api";
import { StatusDocumento } from "@repo/types";

export type MotivoHomologacao = {
  id: number;
  codigo: string;
  descricao: string;
  ativo: boolean;
  exige_texto_livre: boolean;
};

export type FilaDocumento = {
  id: number;
  id_candidatura: number;
  tipo_documento: string;
  nome_arquivo: string;
  status_documento: string;
  fase?: string;
  id_motivo?: number | null;
  motivo_livre?: string | null;
  sugestao_ia?: string | null;
  candidatura?: {
    id: number;
    id_edital?: number;
    status?: string;
    usuario?: { nome?: string; email?: string };
    oferta?: {
      curso?: { nome?: string };
      campus?: { nome?: string };
    };
  };
  motivo?: MotivoHomologacao | null;
};

export async function fetchMotivosHomologacao(): Promise<MotivoHomologacao[]> {
  return apiFetch<MotivoHomologacao[]>("/documentos/motivos");
}

export async function fetchFilaHomologacao(params: {
  edital?: number;
  status?: string;
  fase?: string;
}): Promise<FilaDocumento[]> {
  const q = new URLSearchParams();
  if (params.edital) q.set("edital", String(params.edital));
  if (params.status) q.set("status", params.status);
  if (params.fase) q.set("fase", params.fase);
  const qs = q.toString();
  return apiFetch<FilaDocumento[]>(`/documentos/fila${qs ? `?${qs}` : ""}`);
}

export async function decidirDocumento(
  id: number,
  body: {
    status: StatusDocumento.APROVADO | StatusDocumento.REPROVADO;
    id_motivo?: number;
    motivo_livre?: string;
  },
): Promise<FilaDocumento> {
  return apiFetch<FilaDocumento>(`/documentos/${id}/decidir`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function decidirDocumentosLote(body: {
  ids: number[];
  status: StatusDocumento.APROVADO | StatusDocumento.REPROVADO;
  id_motivo?: number;
  motivo_livre?: string;
}): Promise<{ updated: number; ids: number[] }> {
  return apiFetch("/documentos/decidir-lote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function documentoArquivoUrl(id: number): string {
  return `${getApiBaseUrl()}/documentos/${id}/arquivo`;
}

export async function downloadDocumentoArquivo(id: number): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(documentoArquivoUrl(id), { headers });
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  return res.blob();
}

export async function patchCandidaturaAdmin(
  id: number,
  body: { status?: string; observacoes_admin?: string },
): Promise<unknown> {
  return apiFetch(`/candidaturas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
