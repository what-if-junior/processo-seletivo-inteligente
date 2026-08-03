import { apiFetch } from "./api";

export type CarrosselItem = {
  id: number;
  tipo: "manual" | "auto_edital";
  rotulo: string | null;
  titulo: string;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_link: string | null;
  imagem_url: string | null;
  icone: string | null;
  ordem: number;
  id_edital: number | null;
  ativo: boolean;
  auto_edital_habilitado: boolean;
  inicio_em: string | null;
  fim_em: string | null;
  edital_numero_ano: string | null;
  edital_aberto: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type CreateCarrosselManualPayload = {
  titulo: string;
  rotulo?: string | null;
  subtitulo?: string | null;
  cta_texto?: string | null;
  cta_link?: string | null;
  imagem_url?: string | null;
  icone?: string | null;
  id_edital?: number | null;
  ativo?: boolean;
  inicio_em?: string | null;
  fim_em?: string | null;
  ordem?: number;
};

export type UpdateCarrosselPayload = Partial<CreateCarrosselManualPayload> & {
  auto_edital_habilitado?: boolean;
};

export type SincronizarAutoResult = {
  created: number;
  updated: number;
  skipped_disabled: number;
};

export function listCarrosselGestao(): Promise<CarrosselItem[]> {
  return apiFetch<CarrosselItem[]>("/carrossel/gestao");
}

export function createCarrosselManual(
  payload: CreateCarrosselManualPayload,
): Promise<CarrosselItem> {
  return apiFetch<CarrosselItem>("/carrossel", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCarrosselItem(
  id: number,
  payload: UpdateCarrosselPayload,
): Promise<CarrosselItem> {
  return apiFetch<CarrosselItem>(`/carrossel/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCarrosselItem(
  id: number,
  hard = false,
): Promise<CarrosselItem[]> {
  const q = hard ? "?hard=true" : "";
  return apiFetch<CarrosselItem[]>(`/carrossel/${id}${q}`, {
    method: "DELETE",
  });
}

export function reorderCarrossel(ids: number[]): Promise<CarrosselItem[]> {
  return apiFetch<CarrosselItem[]>("/carrossel/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function sincronizarCarrosselAuto(): Promise<SincronizarAutoResult> {
  return apiFetch<SincronizarAutoResult>("/carrossel/sincronizar-auto", {
    method: "POST",
  });
}

export function patchAutoHabilitado(
  id: number,
  auto_edital_habilitado: boolean,
): Promise<CarrosselItem> {
  return apiFetch<CarrosselItem>(`/carrossel/${id}/auto-habilitado`, {
    method: "PATCH",
    body: JSON.stringify({ auto_edital_habilitado }),
  });
}
