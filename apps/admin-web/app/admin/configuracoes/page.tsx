"use client";

import { useEffect, useState } from "react";
import { Tabs } from "../../../components/Tabs";
import { useToast } from "../../../components/ToastProvider";
import { FaixasSmEditor } from "../../../components/FaixasSmEditor";
import { TiposDocumentoBaseEditor } from "../../../components/TiposDocumentoBaseEditor";
import { TemplatesBibliotecaEditor } from "../../../components/TemplatesBibliotecaEditor";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AdminSettings,
} from "../../../lib/settings";

const TAB_ITEMS = [
  { id: "docs-base", label: "Docs base" },
  { id: "faixas", label: "Faixas SM" },
  { id: "templates", label: "Templates" },
  { id: "geral", label: "Geral" },
  { id: "notificacoes", label: "Notificações" },
  { id: "seguranca", label: "Segurança" },
  { id: "sistema", label: "Sistema" },
];

export default function ConfiguracoesPage() {
  const { push } = useToast();
  const [tab, setTab] = useState("docs-base");
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function persist() {
    saveSettings(settings);
    push("Configurações salvas com sucesso!");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">
          Preferências globais — docs base e faixas SM via API; demais abas
          ainda em localStorage.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Tabs tabs={TAB_ITEMS} active={tab} onChange={setTab} />

        <div className="mt-6 space-y-4">
          {tab === "docs-base" ? <TiposDocumentoBaseEditor /> : null}

          {tab === "faixas" ? <FaixasSmEditor /> : null}

          {tab === "templates" ? <TemplatesBibliotecaEditor /> : null}

          {tab === "geral" ? (
            <>
              <Field label="Nome do Site">
                <input
                  className={inputClass}
                  value={settings.geral.nome_site}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geral: { ...settings.geral, nome_site: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Email de Suporte">
                <input
                  type="email"
                  className={inputClass}
                  value={settings.geral.email_suporte}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geral: {
                        ...settings.geral,
                        email_suporte: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Descrição do Site">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={settings.geral.descricao}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geral: { ...settings.geral, descricao: e.target.value },
                    })
                  }
                />
              </Field>
              <Toggle
                label="Inscrições Abertas"
                checked={settings.geral.inscricoes_abertas}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    geral: { ...settings.geral, inscricoes_abertas: v },
                  })
                }
              />
            </>
          ) : null}

          {tab === "notificacoes" ? (
            <>
              <Toggle
                label="Notificações por Email"
                checked={settings.notificacoes.email}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    notificacoes: { ...settings.notificacoes, email: v },
                  })
                }
              />
              <Toggle
                label="Notificações Push"
                checked={settings.notificacoes.push}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    notificacoes: { ...settings.notificacoes, push: v },
                  })
                }
              />
              <Field label="Token do Telegram">
                <input
                  className={inputClass}
                  value={settings.notificacoes.telegram_token}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notificacoes: {
                        ...settings.notificacoes,
                        telegram_token: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            </>
          ) : null}

          {tab === "seguranca" ? (
            <>
              <Field label="Máximo de Inscrições por Candidato">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={settings.seguranca.max_inscricoes_por_candidato}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      seguranca: {
                        ...settings.seguranca,
                        max_inscricoes_por_candidato:
                          Number(e.target.value) || 1,
                      },
                    })
                  }
                />
              </Field>
              <Toggle
                label="Nível de Autenticação (2FA)"
                checked={settings.seguranca.autenticacao_dois_fatores}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    seguranca: {
                      ...settings.seguranca,
                      autenticacao_dois_fatores: v,
                    },
                  })
                }
              />
            </>
          ) : null}

          {tab === "sistema" ? (
            <>
              <Field label="Ambiente do Sistema">
                <select
                  className={inputClass}
                  value={settings.sistema.ambiente}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sistema: {
                        ...settings.sistema,
                        ambiente: e.target
                          .value as AdminSettings["sistema"]["ambiente"],
                      },
                    })
                  }
                >
                  <option value="desenvolvimento">Desenvolvimento</option>
                  <option value="homologacao">Homologação</option>
                  <option value="producao">Produção</option>
                </select>
              </Field>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    push(
                      "Exportar Backup ainda não conectado ao backend.",
                      "info",
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Exportar Backup
                </button>
                <button
                  type="button"
                  onClick={() => push("Cache local limpo (simulado).", "ok")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Limpar Cache
                </button>
              </div>
            </>
          ) : null}
        </div>

        {tab !== "faixas" && tab !== "docs-base" ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={persist}
              className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Salvar Configurações
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2f9e41]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-[#2f9e41]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
