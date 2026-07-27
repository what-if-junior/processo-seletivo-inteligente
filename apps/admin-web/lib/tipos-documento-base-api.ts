import { FaseDocumento } from "@repo/types";
import { apiFetch, apiUpload } from "./api";

export type TipoDocumentoBase = {
  id: number;
  nome: string;
  descricao?: string | null;
  obrigatorio: boolean;
  formatos: string[];
  tamanho_max_bytes: number;
  template_nome?: string | null;
  template_mime?: string | null;
  fase: FaseDocumento;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  vinculados_count: number;
};

export type TiposDocumentoBaseListResponse = {
  tipos: TipoDocumentoBase[];
};

export type CreateTipoDocumentoBasePayload = {
  nome: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  formatos?: string[];
  tamanho_max_bytes?: number;
  fase?: FaseDocumento;
  ordem?: number;
  ativo?: boolean;
};

export type UpdateTipoDocumentoBasePayload =
  Partial<CreateTipoDocumentoBasePayload>;

export function listTiposDocumentoBaseGestao(): Promise<TiposDocumentoBaseListResponse> {
  return apiFetch<TiposDocumentoBaseListResponse>(
    "/tipos-documento-base/gestao",
  );
}

export function getTipoDocumentoBaseGestao(
  id: number,
): Promise<TipoDocumentoBase> {
  return apiFetch<TipoDocumentoBase>(`/tipos-documento-base/gestao/${id}`);
}

export function createTipoDocumentoBase(
  payload: CreateTipoDocumentoBasePayload,
): Promise<TipoDocumentoBase> {
  return apiFetch<TipoDocumentoBase>("/tipos-documento-base", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTipoDocumentoBase(
  id: number,
  payload: UpdateTipoDocumentoBasePayload,
): Promise<TipoDocumentoBase> {
  return apiFetch<TipoDocumentoBase>(`/tipos-documento-base/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTipoDocumentoBase(
  id: number,
): Promise<TipoDocumentoBase> {
  return apiFetch<TipoDocumentoBase>(`/tipos-documento-base/${id}`, {
    method: "DELETE",
  });
}

export function uploadTipoDocumentoBaseTemplate(
  id: number,
  file: File,
): Promise<TipoDocumentoBase> {
  const fd = new FormData();
  fd.append("arquivo", file);
  return apiUpload<TipoDocumentoBase>(
    `/tipos-documento-base/${id}/template`,
    fd,
  );
}
