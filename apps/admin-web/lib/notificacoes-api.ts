import { apiFetch } from "./api";

export type LembreteNotificacao = {
  id: number;
  tipo: "matricula_prazo" | "etapa_inicio" | "etapa_fim" | string;
  id_edital: number | null;
  offset_horas: number;
  titulo_template: string;
  corpo_template: string;
  ativo: boolean;
  ultimo_processamento_em?: string | null;
  criado_em?: string;
  atualizado_em?: string;
};

export type CreateLembretePayload = {
  tipo: string;
  id_edital?: number | null;
  offset_horas: number;
  titulo_template: string;
  corpo_template: string;
  ativo?: boolean;
};

export type UpdateLembretePayload = Partial<CreateLembretePayload>;

export type CreateNotificacaoPayload = {
  titulo: string;
  corpo: string;
  deep_link?: string | null;
  id_edital?: number | null;
  filtro_campus?: string | null;
  filtro_status?: string | null;
  canais?: string[];
  enviar_agora?: boolean;
};

export function listLembretes(): Promise<LembreteNotificacao[]> {
  return apiFetch<LembreteNotificacao[]>("/notificacoes/lembretes");
}

export function createLembrete(
  payload: CreateLembretePayload,
): Promise<LembreteNotificacao> {
  return apiFetch<LembreteNotificacao>("/notificacoes/lembretes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateLembrete(
  id: number,
  payload: UpdateLembretePayload,
): Promise<LembreteNotificacao> {
  return apiFetch<LembreteNotificacao>(`/notificacoes/lembretes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteLembrete(id: number): Promise<void> {
  return apiFetch<void>(`/notificacoes/lembretes/${id}`, { method: "DELETE" });
}

export function processLembretes(): Promise<{
  processed: number;
  disparos: number;
  skipped: number;
}> {
  return apiFetch("/notificacoes/lembretes/processar", { method: "POST" });
}

export function createNotificacao(payload: CreateNotificacaoPayload) {
  return apiFetch("/notificacoes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
