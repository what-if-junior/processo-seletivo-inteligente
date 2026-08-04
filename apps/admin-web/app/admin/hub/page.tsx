"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useToast } from "../../../components/ToastProvider";
import { ApiError } from "../../../lib/api";
import {
  createHubContacto,
  createHubFaq,
  deleteHubContacto,
  deleteHubFaq,
  fetchHubGestao,
  updateHubContacto,
  updateHubFaq,
  updateHubLgpd,
  type HubContacto,
  type HubFaqItem,
} from "../../../lib/hub-api";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f9e41] focus:outline-none focus:ring-1 focus:ring-[#2f9e41]";

const TIPOS = ["email", "telefone", "url", "endereco", "outro"] as const;

export default function HubAdminPage() {
  const { push } = useToast();
  const [faqs, setFaqs] = useState<HubFaqItem[]>([]);
  const [contactos, setContactos] = useState<HubContacto[]>([]);
  const [textoLgpd, setTextoLgpd] = useState("");
  const [emailExclusao, setEmailExclusao] = useState("reitoria@ifb.edu.br");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [faqEditId, setFaqEditId] = useState<number | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [faqAtivo, setFaqAtivo] = useState(true);

  const [cEditId, setCEditId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<string>("email");
  const [cAtivo, setCAtivo] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHubGestao();
      setFaqs(data.faqs);
      setContactos(data.contactos);
      setTextoLgpd(data.texto_lgpd ?? "");
      setEmailExclusao(data.email_exclusao_dados);
    } catch {
      setFaqs([]);
      setContactos([]);
      push("Falha ao carregar hub.", "info");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetFaq() {
    setFaqEditId(null);
    setPergunta("");
    setResposta("");
    setFaqAtivo(true);
  }

  function resetContacto() {
    setCEditId(null);
    setTitulo("");
    setValor("");
    setTipo("email");
    setCAtivo(true);
  }

  async function onSubmitFaq(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (faqEditId != null) {
        await updateHubFaq(faqEditId, {
          pergunta,
          resposta,
          ativo: faqAtivo,
        });
        push("FAQ atualizada.");
      } else {
        await createHubFaq({ pergunta, resposta, ativo: faqAtivo });
        push("FAQ criada.");
      }
      resetFaq();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar FAQ.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitContacto(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (cEditId != null) {
        await updateHubContacto(cEditId, {
          titulo,
          valor,
          tipo,
          ativo: cAtivo,
        });
        push("Contacto atualizado.");
      } else {
        await createHubContacto({ titulo, valor, tipo, ativo: cAtivo });
        push("Contacto criado.");
      }
      resetContacto();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar contacto.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSaveLgpd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await updateHubLgpd(textoLgpd.trim() || null);
      setTextoLgpd(r.texto_lgpd ?? "");
      push("Texto LGPD guardado.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao guardar LGPD.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Hub de ajuda
        </h1>
        <p className="text-sm text-slate-500">
          FAQ, contactos e texto LGPD exibidos no PWA (REQ-6.3 / 6.4). Remoção
          de dados:{" "}
          <span className="font-medium text-slate-700">{emailExclusao}</span>
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
            <form onSubmit={onSubmitFaq} className="space-y-3">
              <input
                className={inputClass}
                placeholder="Pergunta"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                required
              />
              <textarea
                className={inputClass}
                rows={3}
                placeholder="Resposta"
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={faqAtivo}
                  onChange={(e) => setFaqAtivo(e.target.checked)}
                />
                Ativo (visível no PWA)
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {faqEditId != null ? "Atualizar FAQ" : "Criar FAQ"}
                </button>
                {faqEditId != null ? (
                  <button
                    type="button"
                    onClick={resetFaq}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
            <ul className="divide-y divide-slate-100">
              {faqs.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {f.pergunta}{" "}
                      {!f.ativo ? (
                        <span className="text-xs text-amber-600">(inativo)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
                      {f.resposta}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="text-sm text-[#2f9e41]"
                      onClick={() => {
                        setFaqEditId(f.id);
                        setPergunta(f.pergunta);
                        setResposta(f.resposta);
                        setFaqAtivo(f.ativo);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600"
                      onClick={() => {
                        void (async () => {
                          try {
                            await deleteHubFaq(f.id);
                            push("FAQ removida.");
                            await reload();
                          } catch (err) {
                            push(
                              err instanceof ApiError
                                ? err.message
                                : "Erro ao remover.",
                              "error",
                            );
                          }
                        })();
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Contactos</h2>
            <form onSubmit={onSubmitContacto} className="space-y-3">
              <input
                className={inputClass}
                placeholder="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
              <input
                className={inputClass}
                placeholder="Valor (e-mail, telefone, URL…)"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
              <select
                className={inputClass}
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={cAtivo}
                  onChange={(e) => setCAtivo(e.target.checked)}
                />
                Ativo
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {cEditId != null ? "Atualizar contacto" : "Criar contacto"}
                </button>
                {cEditId != null ? (
                  <button
                    type="button"
                    onClick={resetContacto}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
            <ul className="divide-y divide-slate-100">
              {contactos.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {c.titulo}{" "}
                      <span className="text-xs text-slate-400">({c.tipo})</span>
                      {!c.ativo ? (
                        <span className="text-xs text-amber-600"> inativo</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{c.valor}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="text-sm text-[#2f9e41]"
                      onClick={() => {
                        setCEditId(c.id);
                        setTitulo(c.titulo);
                        setValor(c.valor);
                        setTipo(c.tipo);
                        setCAtivo(c.ativo);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600"
                      onClick={() => {
                        void (async () => {
                          try {
                            await deleteHubContacto(c.id);
                            push("Contacto removido.");
                            await reload();
                          } catch (err) {
                            push(
                              err instanceof ApiError
                                ? err.message
                                : "Erro ao remover.",
                              "error",
                            );
                          }
                        })();
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">LGPD</h2>
            <p className="text-xs text-slate-500">
              Vazio = o PWA usa o texto de fallback (declaração + Lei 13.709/2018
              + e-mail {emailExclusao}).
            </p>
            <form onSubmit={onSaveLgpd} className="space-y-3">
              <textarea
                className={inputClass}
                rows={6}
                placeholder="Texto LGPD / privacidade (opcional)"
                value={textoLgpd}
                onChange={(e) => setTextoLgpd(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Guardar LGPD
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
