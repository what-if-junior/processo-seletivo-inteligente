import { apiFetch } from "./api";

export type FaixaSmWarning = {
  code: string;
  message: string;
};

export type FaixaSm = {
  id: number;
  ordem: number;
  rotulo: string;
  multiplicador_min?: number | null;
  multiplicador_max?: number | null;
  ativo: boolean;
  criado_em: string;
};

export type FaixasSmEnvelope = {
  salario_minimo_referencia: number;
  faixas: FaixaSm[];
  regra_b_socioeconomico: boolean;
  warnings: FaixaSmWarning[];
};

export type FaixaSmDetail = FaixaSm & {
  salario_minimo_referencia: number;
  regra_b_socioeconomico: boolean;
  warnings: FaixaSmWarning[];
};

export type CreateFaixaSmPayload = {
  rotulo: string;
  multiplicador_min?: number | null;
  multiplicador_max?: number | null;
  ordem?: number;
  ativo?: boolean;
};

export type UpdateFaixaSmPayload = Partial<CreateFaixaSmPayload>;

export function listFaixasSmGestao(): Promise<FaixasSmEnvelope> {
  return apiFetch<FaixasSmEnvelope>("/faixas-sm/gestao");
}

export function createFaixaSm(
  payload: CreateFaixaSmPayload,
): Promise<FaixaSmDetail> {
  return apiFetch<FaixaSmDetail>("/faixas-sm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFaixaSm(
  id: number,
  payload: UpdateFaixaSmPayload,
): Promise<FaixaSmDetail> {
  return apiFetch<FaixaSmDetail>(`/faixas-sm/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFaixaSm(
  id: number,
  hard = false,
): Promise<FaixasSmEnvelope> {
  const q = hard ? "?hard=true" : "";
  return apiFetch<FaixasSmEnvelope>(`/faixas-sm/${id}${q}`, {
    method: "DELETE",
  });
}

export function reorderFaixasSm(ids: number[]): Promise<FaixasSmEnvelope> {
  return apiFetch<FaixasSmEnvelope>("/faixas-sm/ordem", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function updateSmReferencia(
  salario_minimo_referencia: number,
): Promise<FaixasSmEnvelope> {
  return apiFetch<FaixasSmEnvelope>("/faixas-sm/referencia", {
    method: "PATCH",
    body: JSON.stringify({ salario_minimo_referencia }),
  });
}
