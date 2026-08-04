import { apiFetch } from "./api";

export type HubFaqItem = {
  id: number;
  pergunta: string;
  resposta: string;
  ordem: number;
  ativo: boolean;
};

export type HubContacto = {
  id: number;
  titulo: string;
  valor: string;
  tipo: string;
  ordem: number;
  ativo: boolean;
};

export type HubGestao = {
  faqs: HubFaqItem[];
  contactos: HubContacto[];
  texto_lgpd: string | null;
  email_exclusao_dados: string;
};

export function fetchHubGestao(): Promise<HubGestao> {
  return apiFetch<HubGestao>("/hub/gestao");
}

export function createHubFaq(payload: {
  pergunta: string;
  resposta: string;
  ordem?: number;
  ativo?: boolean;
}): Promise<HubFaqItem> {
  return apiFetch<HubFaqItem>("/hub/faqs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHubFaq(
  id: number,
  payload: Partial<{
    pergunta: string;
    resposta: string;
    ordem: number;
    ativo: boolean;
  }>,
): Promise<HubFaqItem> {
  return apiFetch<HubFaqItem>(`/hub/faqs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteHubFaq(id: number): Promise<void> {
  return apiFetch<void>(`/hub/faqs/${id}`, { method: "DELETE" });
}

export function createHubContacto(payload: {
  titulo: string;
  valor: string;
  tipo?: string;
  ordem?: number;
  ativo?: boolean;
}): Promise<HubContacto> {
  return apiFetch<HubContacto>("/hub/contactos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHubContacto(
  id: number,
  payload: Partial<{
    titulo: string;
    valor: string;
    tipo: string;
    ordem: number;
    ativo: boolean;
  }>,
): Promise<HubContacto> {
  return apiFetch<HubContacto>(`/hub/contactos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteHubContacto(id: number): Promise<void> {
  return apiFetch<void>(`/hub/contactos/${id}`, { method: "DELETE" });
}

export function updateHubLgpd(
  texto_lgpd: string | null,
): Promise<{ texto_lgpd: string | null }> {
  return apiFetch<{ texto_lgpd: string | null }>("/hub/lgpd", {
    method: "PUT",
    body: JSON.stringify({ texto_lgpd }),
  });
}
