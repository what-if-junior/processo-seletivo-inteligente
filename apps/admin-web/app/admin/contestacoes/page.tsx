"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { StatusContestacao, TipoContestacao } from "@repo/types";
import { useToast } from "../../../components/ToastProvider";
import { ApiError } from "../../../lib/api";
import {
  downloadContestacaoAnexo,
  getContestacao,
  listContestacoes,
  patchContestacaoStatus,
  responderContestacao,
  type ContestacaoRow,
} from "../../../lib/contestacoes-api";
import {
  listTemplatesEdital,
  type TemplateEdital,
} from "../../../lib/templates-api";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f9e41] focus:outline-none";

export default function ContestacoesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<ContestacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edital, setEdital] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<ContestacaoRow | null>(null);
  const [replyTemplates, setReplyTemplates] = useState<TemplateEdital[]>([]);
  const [tplId, setTplId] = useState("");
  const [corpo, setCorpo] = useState("");
  const [canalEmail, setCanalEmail] = useState(true);
  const [canalPwa, setCanalPwa] = useState(true);
  const [replyStatus, setReplyStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await listContestacoes({
          edital: edital ? Number(edital) : undefined,
          tipo: tipo || undefined,
          status: status || undefined,
        }),
      );
    } catch {
      setRows([]);
      push("Falha ao carregar contestações.", "info");
    } finally {
      setLoading(false);
    }
  }, [edital, tipo, status, push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function openDetail(id: number) {
    try {
      const row = await getContestacao(id);
      setDetail(row);
      setCorpo("");
      setTplId("");
      setReplyStatus("");
      if (row.id_edital) {
        const tpls = await listTemplatesEdital(
          row.id_edital,
          "RESPOSTA_CONTESTACAO",
        );
        setReplyTemplates(tpls);
      } else setReplyTemplates([]);
    } catch {
      push("Falha ao abrir detalhe.", "error");
    }
  }

  async function onStatus(next: string) {
    if (!detail) return;
    setBusy(true);
    try {
      const updated = await patchContestacaoStatus(detail.id, next);
      setDetail(updated);
      push("Status atualizado.");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Transição inválida.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const canais: ("email" | "pwa")[] = [];
    if (canalEmail) canais.push("email");
    if (canalPwa) canais.push("pwa");
    if (!canais.length) {
      push("Selecione ao menos um canal.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await responderContestacao(detail.id, {
        corpo,
        canais,
        id_template_edital: tplId ? Number(tplId) : undefined,
        status: replyStatus || undefined,
      });
      setDetail(await getContestacao(detail.id));
      push(
        `Resposta enviada (${(res.historico_criado || []).length || canais.length} histórico).`,
      );
      setCorpo("");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Falha ao responder.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Contestações</h1>
        <p className="text-sm text-slate-500">
          Inbox de impugnações, recursos e justificativas (W29/W30).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className={inputClass}
          placeholder="Edital id"
          value={edital}
          onChange={(e) => setEdital(e.target.value)}
        />
        <select
          className={inputClass}
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {Object.values(TipoContestacao).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.values(StatusContestacao).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white"
        >
          Filtrar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Carregando…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Id</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Edital</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b hover:bg-slate-50"
                    onClick={() => void openDetail(r.id)}
                  >
                    <td className="px-3 py-2 font-medium">{r.id}</td>
                    <td className="px-3 py-2">{r.tipo}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.id_edital ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-slate-500">
                      Nenhuma contestação.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {!detail ? (
            <p className="text-sm text-slate-500">
              Selecione uma contestação para ver detalhes e responder.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h2 className="text-lg font-semibold">
                  #{detail.id} · {detail.tipo}
                </h2>
                <p className="text-slate-500">
                  Status: {detail.status}
                  {detail.nome_requerente
                    ? ` · ${detail.nome_requerente} <${detail.email_requerente}>`
                    : ""}
                </p>
              </div>
              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
                {detail.texto}
              </p>
              {detail.nome_anexo ? (
                <button
                  type="button"
                  className="text-[#2f9e41] hover:underline"
                  onClick={() =>
                    void downloadContestacaoAnexo(detail.id).then((blob) => {
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    })
                  }
                >
                  Baixar anexo ({detail.nome_anexo})
                </button>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-500 self-center">
                  Status:
                </span>
                {Object.values(StatusContestacao).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || detail.status === s}
                    onClick={() => void onStatus(s)}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Histórico</h3>
                <ul className="space-y-2">
                  {(detail.historico || []).map((h) => (
                    <li
                      key={h.id}
                      className="rounded border border-slate-200 p-2 text-xs"
                    >
                      <p className="font-semibold uppercase text-slate-500">
                        {h.canal} ·{" "}
                        {new Date(h.enviado_em).toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{h.corpo}</p>
                    </li>
                  ))}
                  {(detail.historico || []).length === 0 ? (
                    <li className="text-slate-500">Sem respostas ainda.</li>
                  ) : null}
                </ul>
              </div>

              <form onSubmit={onReply} className="space-y-2 border-t pt-4">
                <h3 className="font-semibold">Responder (individual)</h3>
                <select
                  className={`${inputClass} w-full`}
                  value={tplId}
                  onChange={(e) => {
                    setTplId(e.target.value);
                    const t = replyTemplates.find(
                      (x) => x.id === Number(e.target.value),
                    );
                    if (t) setCorpo(t.corpo);
                  }}
                >
                  <option value="">Template (opcional)…</option>
                  {replyTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} · {t.titulo}
                    </option>
                  ))}
                </select>
                <textarea
                  className={`${inputClass} min-h-28 w-full`}
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                  required
                  placeholder="Corpo da resposta"
                />
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={canalEmail}
                      onChange={(e) => setCanalEmail(e.target.checked)}
                    />
                    E-mail
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={canalPwa}
                      onChange={(e) => setCanalPwa(e.target.checked)}
                    />
                    PWA
                  </label>
                  <select
                    className={inputClass}
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                  >
                    <option value="">Manter / em_analise</option>
                    <option value="deferida">deferida</option>
                    <option value="indeferida">indeferida</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Enviar resposta
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
