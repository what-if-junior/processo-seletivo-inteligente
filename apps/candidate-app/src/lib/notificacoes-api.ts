import { apiFetch, getAccessToken } from "./api";

export type CandidateNotificacao = {
  id: number;
  titulo: string;
  corpo: string;
  deep_link: string | null;
  origem: string;
  id_edital: number | null;
  criado_em: string;
  enviado_em: string | null;
  lida: boolean;
  lida_em: string | null;
  leitura_id: number;
};

export type PreferenciaAvisos = {
  id: number;
  id_usuario: number;
  silenciar_email: boolean;
  silenciar_push: boolean;
  silenciar_oficiais: boolean;
  atualizado_em?: string;
};

export function fetchMinhasNotificacoes(): Promise<{
  items: CandidateNotificacao[];
  unread: number;
}> {
  return apiFetch("/notificacoes/me");
}

export function markNotificacaoLida(
  id: number,
): Promise<CandidateNotificacao> {
  return apiFetch(`/notificacoes/${id}/lida`, { method: "PATCH" });
}

export function markTodasNotificacoesLidas(): Promise<{ updated: number }> {
  return apiFetch("/notificacoes/me/marcar-todas-lidas", { method: "POST" });
}

export function fetchPreferenciasAvisos(): Promise<PreferenciaAvisos> {
  return apiFetch("/notificacoes/preferencias");
}

export function updatePreferenciasAvisos(
  patch: Partial<
    Pick<
      PreferenciaAvisos,
      "silenciar_email" | "silenciar_push" | "silenciar_oficiais"
    >
  >,
): Promise<PreferenciaAvisos> {
  return apiFetch("/notificacoes/preferencias", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function canFetchNotificacoes(): boolean {
  return Boolean(getAccessToken());
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Há ${days} dia${days > 1 ? "s" : ""}`;
}

export function inferNotifTipo(
  titulo: string,
  origem: string,
): "erro" | "info" | "sucesso" | "aviso" {
  const t = titulo.toLowerCase();
  if (t.includes("rejeit") || t.includes("reprov") || t.includes("erro")) {
    return "erro";
  }
  if (t.includes("aprov") || t.includes("homolog")) return "sucesso";
  if (origem.includes("cronograma") || t.includes("prazo") || t.includes("lembrete")) {
    return "aviso";
  }
  return "info";
}
