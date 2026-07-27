export type AdminSettings = {
  geral: {
    nome_site: string;
    email_suporte: string;
    descricao: string;
    inscricoes_abertas: boolean;
  };
  notificacoes: {
    email: boolean;
    push: boolean;
    telegram_token: string;
  };
  seguranca: {
    max_inscricoes_por_candidato: number;
    autenticacao_dois_fatores: boolean;
  };
  sistema: {
    ambiente: "desenvolvimento" | "homologacao" | "producao";
  };
};

export const DEFAULT_SETTINGS: AdminSettings = {
  geral: {
    nome_site: "IFB Admin",
    email_suporte: "suporte@ifb.edu.br",
    descricao: "Console de revisão de processos seletivos do IFB.",
    inscricoes_abertas: true,
  },
  notificacoes: {
    email: true,
    push: false,
    telegram_token: "",
  },
  seguranca: {
    max_inscricoes_por_candidato: 1,
    autenticacao_dois_fatores: false,
  },
  sistema: {
    ambiente: "desenvolvimento",
  },
};

const KEY = "admin_settings";

export function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AdminSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AdminSettings): void {
  window.localStorage.setItem(KEY, JSON.stringify(settings));
}
