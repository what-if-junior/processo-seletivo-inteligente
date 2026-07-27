import {
  CampoFormularioTipo,
  FaseDocumento,
} from "@repo/types";
import { apiFetch, apiUpload } from "./api";

export type TiposDocumentoWarning = {
  code: string;
  message: string;
  inscricoes_count?: number;
};

export type TipoDocumentoCampo = {
  id: number;
  id_tipo_documento: number;
  tipo: CampoFormularioTipo;
  rotulo: string;
  obrigatorio: boolean;
  ordem: number;
  formatos?: string[] | null;
  tamanho_max_bytes?: number | null;
};

export type TipoDocumento = {
  id: number;
  id_edital: number;
  id_tipo_base?: number | null;
  nome: string;
  descricao?: string | null;
  obrigatorio: boolean;
  formatos: string[];
  tamanho_max_bytes: number;
  template_nome?: string | null;
  template_mime?: string | null;
  fase: FaseDocumento;
  tipo_cota?: string | null;
  ordem: number;
  campos: TipoDocumentoCampo[];
  herdado?: boolean;
  warnings?: TiposDocumentoWarning[];
};

export type TiposDocumentoListResponse = {
  tipos: TipoDocumento[];
  warnings: TiposDocumentoWarning[];
};

export type CreateTipoDocumentoPayload = {
  nome: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  formatos?: string[];
  tamanho_max_bytes?: number;
  fase: FaseDocumento;
  tipo_cota?: string | null;
  ordem?: number;
};

export type UpdateTipoDocumentoPayload = Partial<CreateTipoDocumentoPayload>;

export type CampoPayload = {
  tipo: CampoFormularioTipo;
  rotulo: string;
  obrigatorio?: boolean;
  ordem?: number;
  formatos?: string[] | null;
  tamanho_max_bytes?: number | null;
};

function base(editalId: number): string {
  return `/editais/${editalId}/tipos-documento`;
}

export function listTiposDocumentoGestao(
  editalId: number,
): Promise<TiposDocumentoListResponse> {
  return apiFetch<TiposDocumentoListResponse>(`${base(editalId)}/gestao`);
}

export function getTipoDocumentoGestao(
  editalId: number,
  id: number,
): Promise<TipoDocumento> {
  return apiFetch<TipoDocumento>(`${base(editalId)}/gestao/${id}`);
}

export function createTipoDocumento(
  editalId: number,
  payload: CreateTipoDocumentoPayload,
): Promise<TipoDocumento> {
  return apiFetch<TipoDocumento>(base(editalId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTipoDocumento(
  editalId: number,
  id: number,
  payload: UpdateTipoDocumentoPayload,
): Promise<TipoDocumento> {
  return apiFetch<TipoDocumento>(`${base(editalId)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTipoDocumento(
  editalId: number,
  id: number,
): Promise<TipoDocumento> {
  return apiFetch<TipoDocumento>(`${base(editalId)}/${id}`, {
    method: "DELETE",
  });
}

export function replaceTipoDocumentoCampos(
  editalId: number,
  id: number,
  campos: CampoPayload[],
): Promise<TipoDocumento> {
  return apiFetch<TipoDocumento>(`${base(editalId)}/${id}/campos`, {
    method: "PUT",
    body: JSON.stringify({ campos }),
  });
}

export function uploadTipoDocumentoTemplate(
  editalId: number,
  id: number,
  file: File,
): Promise<TipoDocumento> {
  const fd = new FormData();
  fd.append("arquivo", file);
  return apiUpload<TipoDocumento>(`${base(editalId)}/${id}/template`, fd);
}
