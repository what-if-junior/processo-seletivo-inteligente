"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useToast } from "./ToastProvider";
import { ApiError } from "../lib/api";
import {
  createBiblioteca,
  deleteBiblioteca,
  listBiblioteca,
  updateBiblioteca,
  type TemplateBiblioteca,
} from "../lib/templates-api";

const TIPO_USO = [
  "RESPOSTA_CONTESTACAO",
  "INSTRUCAO_ETAPA",
  "IMPUGNACAO_EMAIL",
] as const;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f9e41] focus:outline-none focus:ring-1 focus:ring-[#2f9e41]";

export function TemplatesBibliotecaEditor() {
  const { push } = useToast();
  const [rows, setRows] = useState<TemplateBiblioteca[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [canal, setCanal] = useState("ambos");
  const [tipoUso, setTipoUso] = useState<string>("RESPOSTA_CONTESTACAO");
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listBiblioteca());
    } catch {
      setRows([]);
      push("Falha ao carregar biblioteca.", "info");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function startEdit(row: TemplateBiblioteca) {
    setEditId(row.id);
    setTitulo(row.titulo);
    setCorpo(row.corpo);
    setCanal(row.canal || "ambos");
    setTipoUso(row.tipo_uso || "RESPOSTA_CONTESTACAO");
  }

  function reset() {
    setEditId(null);
    setTitulo("");
    setCorpo("");
    setCanal("ambos");
    setTipoUso("RESPOSTA_CONTESTACAO");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editId != null) {
        await updateBiblioteca(editId, {
          titulo,
          corpo,
          canal,
          tipo_uso: tipoUso,
        });
        push("Template atualizado.");
      } else {
        await createBiblioteca({
          titulo,
          corpo,
          canal,
          tipo_uso: tipoUso,
          ativo: true,
        });
        push("Template criado.");
      }
      reset();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar template.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Remover / desativar template?")) return;
    setBusy(true);
    try {
      await deleteBiblioteca(id);
      push("Template removido ou desativado.");
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

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          {editId != null ? `Editar #${editId}` : "Novo template"}
        </h3>
        <input
          className={inputClass}
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
        <textarea
          className={`${inputClass} min-h-28`}
          placeholder="Corpo"
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={inputClass}
            value={tipoUso}
            onChange={(e) => setTipoUso(e.target.value)}
          >
            {TIPO_USO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
          >
            <option value="email">email</option>
            <option value="pwa">pwa</option>
            <option value="ambos">ambos</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {editId != null ? "Salvar" : "Criar"}
          </button>
          {editId != null ? (
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm"
              onClick={reset}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <ul className="divide-y rounded-lg border border-slate-200">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  #{r.id} · {r.titulo}{" "}
                  {!r.ativo ? (
                    <span className="text-amber-700">(inativo)</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {r.tipo_uso} · {r.canal || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[#2f9e41] hover:underline"
                  onClick={() => startEdit(r)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => void onDelete(r.id)}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="px-3 py-4 text-slate-500">Nenhum template.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
