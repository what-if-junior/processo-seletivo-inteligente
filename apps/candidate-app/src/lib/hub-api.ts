import { apiFetch } from "./api";

export const LGPD_EXCLUSAO_EMAIL = "reitoria@ifb.edu.br";

export const LGPD_FALLBACK_TEXT = `Você pode solicitar exclusão dos dados a qualquer momento pelo e-mail ${LGPD_EXCLUSAO_EMAIL}, conforme a Lei 13.709/2018 (LGPD). Os dados do processo seletivo são tratados conforme o edital e a política de privacidade do IFB.`;

export type HubFaqPublic = {
  id: number;
  pergunta: string;
  resposta: string;
  ordem: number;
  ativo: boolean;
};

export type HubContactoPublic = {
  id: number;
  titulo: string;
  valor: string;
  tipo: string;
  ordem: number;
  ativo: boolean;
};

export type HubPublic = {
  faqs: HubFaqPublic[];
  contactos: HubContactoPublic[];
  texto_lgpd: string | null;
  email_exclusao_dados: string;
};

export const HUB_FAQ_FALLBACK: HubFaqPublic[] = [
  {
    id: 1,
    pergunta: "Como me inscrever?",
    resposta:
      "Acesse a Home, escolha um curso com inscrição aberta e complete o formulário. É permitido apenas um curso por edital.",
    ordem: 1,
    ativo: true,
  },
  {
    id: 2,
    pergunta: "Onde enviar documentos?",
    resposta:
      "Após a inscrição, use a área Documentos do aplicativo conforme a etapa e o campus do edital.",
    ordem: 2,
    ativo: true,
  },
  {
    id: 3,
    pergunta: "Como funciona o sorteio?",
    resposta:
      "Quando o edital usa sorteio (ou fase preliminar híbrida), a classificação é publicada no cronograma. Consulte o PDF do edital.",
    ordem: 3,
    ativo: true,
  },
  {
    id: 4,
    pergunta: "Qual é o prazo?",
    resposta:
      "Os prazos variam por edital. Veja o cronograma na ficha do processo e os avisos na aba Avisos.",
    ordem: 4,
    ativo: true,
  },
];

export const HUB_CONTACTOS_FALLBACK: HubContactoPublic[] = [
  {
    id: 1,
    titulo: "Reitoria IFB (LGPD / remoção de dados)",
    valor: LGPD_EXCLUSAO_EMAIL,
    tipo: "email",
    ordem: 1,
    ativo: true,
  },
];

export function resolveLgpdText(
  textoLgpd: string | null | undefined,
): string {
  const t = (textoLgpd ?? "").trim();
  return t || LGPD_FALLBACK_TEXT;
}

export function fetchHubPublic(): Promise<HubPublic> {
  return apiFetch<HubPublic>("/hub");
}
