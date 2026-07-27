"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../../../lib/api";
import { createEdital } from "../../../../lib/processos-api";
import {
  listTiposDocumentoBaseGestao,
  type TipoDocumentoBase,
} from "../../../../lib/tipos-documento-base-api";
import { useToast } from "../../../../components/ToastProvider";
import {
  ProcessoFormFields,
  emptyProcessoForm,
  toCreatePayload,
  type ProcessoFormState,
} from "../../../../components/ProcessoFormFields";

export default function NovoProcessoPage() {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState<ProcessoFormState>(emptyProcessoForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bases, setBases] = useState<TipoDocumentoBase[]>([]);
  const [selectedBaseIds, setSelectedBaseIds] = useState<number[]>([]);
  const [basesLoaded, setBasesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await listTiposDocumentoBaseGestao();
        if (cancelled) return;
        const ativos = res.tipos
          .filter((t) => t.ativo)
          .slice()
          .sort((a, b) => a.ordem - b.ordem);
        setBases(ativos);
        setSelectedBaseIds(ativos.map((t) => t.id));
      } catch {
        if (!cancelled) setBases([]);
      } finally {
        if (!cancelled) setBasesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleBase(id: number) {
    setSelectedBaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllBases() {
    setSelectedBaseIds(bases.map((t) => t.id));
  }

  function clearBases() {
    setSelectedBaseIds([]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toCreatePayload(form);
      if (!payload.numero_ano || !payload.termos_valor) {
        throw new Error("Número/ano e termos são obrigatórios.");
      }
      // omit = all active; [] = none; list = subset (REQ-1.5)
      const allIds = bases.map((t) => t.id);
      const allSelected =
        allIds.length > 0 &&
        selectedBaseIds.length === allIds.length &&
        allIds.every((id) => selectedBaseIds.includes(id));
      if (!allSelected) {
        payload.tipos_base_ids = selectedBaseIds;
      }
      const created = await createEdital(payload);
      push("Processo criado como rascunho.");
      router.push(`/admin/processos/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Falha ao criar processo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Novo processo seletivo
        </h1>
        <p className="text-sm text-slate-500">
          Rascunho: publique só após enviar o PDF do edital. Link oficial é
          opcional. Tipos base ativos são herdados por omissão (desmarcáveis).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <ProcessoFormFields form={form} onChange={setForm} disabled={saving} />

        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">
            Documentação base a herdar (REQ-1.5)
          </legend>
          <p className="text-xs text-slate-500">
            Desmarque os tipos que não devem entrar neste processo. Depois da
            criação, desvincule no detalhe do processo se necessário.
          </p>
          {!basesLoaded ? (
            <p className="text-sm text-slate-500">Carregando tipos base…</p>
          ) : bases.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum tipo base ativo. Configure em Configurações → Docs base.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  onClick={selectAllBases}
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  onClick={clearBases}
                >
                  Desmarcar todos
                </button>
              </div>
              <ul className="space-y-2">
                {bases.map((t) => {
                  const checked = selectedBaseIds.includes(t.id);
                  return (
                    <li key={t.id}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleBase(t.id)}
                          disabled={saving}
                        />
                        <span>
                          <span className="font-medium">{t.nome}</span>
                          <span className="block text-xs text-slate-500">
                            {t.fase} ·{" "}
                            {t.obrigatorio ? "obrigatório" : "opcional"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </fieldset>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/processos")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Criar rascunho"}
          </button>
        </div>
      </form>
    </div>
  );
}
