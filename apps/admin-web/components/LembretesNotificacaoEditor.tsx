"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import {
  createLembrete,
  deleteLembrete,
  listLembretes,
  processLembretes,
  updateLembrete,
  type LembreteNotificacao,
} from "../lib/notificacoes-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass, Toggle } from "./ProcessoFormFields";

const TIPOS = [
  { value: "matricula_prazo", label: "Prazo de matrícula (antes do fim)" },
  { value: "etapa_inicio", label: "Início de etapa" },
  { value: "etapa_fim", label: "Fim de etapa" },
];

export function LembretesNotificacaoEditor() {
  const { push } = useToast();
  const [rows, setRows] = useState<LembreteNotificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tipo, setTipo] = useState("matricula_prazo");
  const [offset, setOffset] = useState("-48");
  const [titulo, setTitulo] = useState("Prazo de matrícula se aproximando");
  const [corpo, setCorpo] = useState(
    "A etapa de matrícula do processo {{edital}} encerra em breve ({{data_fim}}). Regularize sua matrícula pelo aplicativo.",
  );
  const [ativo, setAtivo] = useState(true);
  const [editalId, setEditalId] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listLembretes());
    } catch (e) {
      push(
        e instanceof ApiError ? e.message : "Falha ao carregar lembretes.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createLembrete({
        tipo,
        offset_horas: Number(offset),
        titulo_template: titulo.trim(),
        corpo_template: corpo.trim(),
        ativo,
        id_edital: editalId.trim() ? Number(editalId) : null,
      });
      push("Lembrete criado.");
      setEditalId("");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao criar lembrete.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleAtivo(row: LembreteNotificacao) {
    setBusy(true);
    try {
      await updateLembrete(row.id, { ativo: !row.ativo });
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao atualizar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Remover este lembrete?")) return;
    setBusy(true);
    try {
      await deleteLembrete(id);
      push("Lembrete removido.");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao remover.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onProcess() {
    setBusy(true);
    try {
      const res = await processLembretes();
      push(
        `Processados ${res.processed} lembrete(s): ${res.disparos} disparo(s), ${res.skipped} ignorado(s).`,
      );
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao processar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando lembretes…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Lembretes automáticos
          </h2>
          <p className="text-sm text-slate-500">
            Ex.: matrícula se aproximando — offset em horas (negativo = antes da
            âncora). Placeholders: {"{{edital}}"}, {"{{etapa}}"}, {"{{data_fim}}"}.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onProcess()}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Processar agora
        </button>
      </div>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {rows.length === 0 ? (
          <li className="px-4 py-3 text-sm text-slate-500">Nenhum lembrete.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {row.titulo_template}
                </p>
                <p className="text-xs text-slate-500">
                  {row.tipo} · offset {row.offset_horas}h
                  {row.id_edital != null ? ` · edital #${row.id_edital}` : " · global"}
                  {row.ativo ? "" : " · inativo"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleAtivo(row)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  {row.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(row.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700"
                >
                  Remover
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Novo lembrete</h3>
        <Field label="Tipo">
          <select
            className={inputClass}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Offset (horas)">
          <input
            className={inputClass}
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
            placeholder="-48"
          />
        </Field>
        <Field label="Id edital (opcional)">
          <input
            className={inputClass}
            value={editalId}
            onChange={(e) => setEditalId(e.target.value)}
            placeholder="vazio = todos"
          />
        </Field>
        <Field label="Título (template)">
          <input
            className={inputClass}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </Field>
        <Field label="Corpo (template)">
          <textarea
            className={inputClass}
            rows={3}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            required
          />
        </Field>
        <Toggle label="Ativo" checked={ativo} onChange={setAtivo} />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {busy ? "Salvando…" : "Criar lembrete"}
          </button>
        </div>
      </form>
    </div>
  );
}
