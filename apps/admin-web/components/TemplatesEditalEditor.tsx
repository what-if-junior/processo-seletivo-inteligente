"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "./ToastProvider";
import { ApiError } from "../lib/api";
import {
  copiarTemplateEdital,
  deleteTemplateEdital,
  listBiblioteca,
  listTemplatesEdital,
  updateTemplateEdital,
  type TemplateBiblioteca,
  type TemplateEdital,
} from "../lib/templates-api";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f9e41] focus:outline-none focus:ring-1 focus:ring-[#2f9e41]";

export function TemplatesEditalEditor({ editalId }: { editalId: number }) {
  const { push } = useToast();
  const [rows, setRows] = useState<TemplateEdital[]>([]);
  const [bib, setBib] = useState<TemplateBiblioteca[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [corpo, setCorpo] = useState("");

  const reload = useCallback(async () => {
    try {
      const [copies, library] = await Promise.all([
        listTemplatesEdital(editalId),
        listBiblioteca(true),
      ]);
      setRows(copies);
      setBib(library);
    } catch {
      setRows([]);
      push("Falha ao carregar templates do edital.", "info");
    }
  }, [editalId, push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCopiar() {
    const id = Number(pick);
    if (!id) return;
    setBusy(true);
    try {
      await copiarTemplateEdital(editalId, id);
      push("Template copiado para o edital.");
      setPick("");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao copiar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSaveCorpo() {
    if (editId == null) return;
    setBusy(true);
    try {
      await updateTemplateEdital(editalId, editId, { corpo });
      push("Cópia do edital atualizada (biblioteca intacta).");
      setEditId(null);
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Templates do edital
        </h2>
        <p className="text-sm text-slate-500">
          Cópias editáveis a partir da biblioteca (W30).
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <select
          className={`${inputClass} max-w-md`}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        >
          <option value="">Copiar da biblioteca…</option>
          {bib.map((b) => (
            <option key={b.id} value={b.id}>
              #{b.id} · {b.titulo} ({b.tipo_uso})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!pick || busy}
          onClick={() => void onCopiar()}
          className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Copiar
        </button>
      </div>
      <ul className="divide-y rounded-lg border border-slate-200">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 px-3 py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">
                  #{r.id} · {r.titulo}
                </p>
                <p className="text-xs text-slate-500">{r.tipo_uso}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[#2f9e41] hover:underline"
                  onClick={() => {
                    setEditId(r.id);
                    setCorpo(r.corpo);
                  }}
                >
                  Editar corpo
                </button>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => {
                    if (!window.confirm("Remover cópia?")) return;
                    void deleteTemplateEdital(editalId, r.id).then(reload);
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
            {editId === r.id ? (
              <div className="space-y-2">
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSaveCorpo()}
                  className="rounded-lg bg-[#2f9e41] px-3 py-1.5 text-xs font-medium text-white"
                >
                  Salvar corpo
                </button>
              </div>
            ) : (
              <p className="line-clamp-2 text-xs text-slate-600 whitespace-pre-wrap">
                {r.corpo}
              </p>
            )}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-3 py-4 text-slate-500">Nenhuma cópia neste edital.</li>
        ) : null}
      </ul>
    </div>
  );
}
