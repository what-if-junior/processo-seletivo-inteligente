"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import {
  createFaixaSm,
  deleteFaixaSm,
  listFaixasSmGestao,
  reorderFaixasSm,
  updateFaixaSm,
  updateSmReferencia,
  type FaixaSm,
  type FaixaSmWarning,
} from "../lib/faixas-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass, Toggle } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";

export function FaixasSmEditor() {
  const { push } = useToast();
  const [faixas, setFaixas] = useState<FaixaSm[]>([]);
  const [smRef, setSmRef] = useState("1518");
  const [regraB, setRegraB] = useState(false);
  const [warnings, setWarnings] = useState<FaixaSmWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [rotulo, setRotulo] = useState("");
  const [multMin, setMultMin] = useState("");
  const [multMax, setMultMax] = useState("");
  const [ativo, setAtivo] = useState(true);

  const applyEnvelope = useCallback(
    (env: {
      salario_minimo_referencia: number;
      faixas: FaixaSm[];
      regra_b_socioeconomico: boolean;
      warnings: FaixaSmWarning[];
    }) => {
      setSmRef(String(env.salario_minimo_referencia));
      setFaixas(
        env.faixas.slice().sort((a, b) => a.ordem - b.ordem),
      );
      setRegraB(env.regra_b_socioeconomico);
      setWarnings(env.warnings ?? []);
    },
    [],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const env = await listFaixasSmGestao();
      applyEnvelope(env);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Falha ao carregar faixas de salário mínimo.",
      );
    } finally {
      setLoading(false);
    }
  }, [applyEnvelope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetForm() {
    setEditId(null);
    setRotulo("");
    setMultMin("");
    setMultMax("");
    setAtivo(true);
  }

  function loadFaixa(f: FaixaSm) {
    setEditId(f.id);
    setRotulo(f.rotulo);
    setMultMin(
      f.multiplicador_min != null ? String(f.multiplicador_min) : "",
    );
    setMultMax(
      f.multiplicador_max != null ? String(f.multiplicador_max) : "",
    );
    setAtivo(f.ativo);
  }

  async function onSaveSm(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(smRef);
    if (!Number.isFinite(n) || n < 0) {
      push("SM de referência inválido.", "error");
      return;
    }
    setBusy(true);
    try {
      const env = await updateSmReferencia(n);
      applyEnvelope(env);
      push("SM de referência atualizado.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar SM.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rotulo.trim()) {
      push("Informe o rótulo da faixa.", "error");
      return;
    }
    const min = multMin.trim() ? Number(multMin) : null;
    const max = multMax.trim() ? Number(multMax) : null;
    if (min != null && !Number.isFinite(min)) {
      push("Multiplicador mínimo inválido.", "error");
      return;
    }
    if (max != null && !Number.isFinite(max)) {
      push("Multiplicador máximo inválido.", "error");
      return;
    }
    if (min != null && max != null && max < min) {
      push("Multiplicador máximo deve ser ≥ mínimo.", "error");
      return;
    }

    setBusy(true);
    const payload = {
      rotulo: rotulo.trim(),
      multiplicador_min: min,
      multiplicador_max: max,
      ativo,
    };
    try {
      if (editId != null) {
        const detail = await updateFaixaSm(editId, payload);
        setWarnings(detail.warnings ?? []);
        setRegraB(detail.regra_b_socioeconomico);
        push("Faixa atualizada.");
      } else {
        const detail = await createFaixaSm(payload);
        setWarnings(detail.warnings ?? []);
        setRegraB(detail.regra_b_socioeconomico);
        push("Faixa criada.");
      }
      resetForm();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar faixa.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number, hard: boolean) {
    const msg = hard
      ? "Excluir permanentemente esta faixa? (não recomendado se já houver respostas)"
      : "Desativar esta faixa? (soft delete — preserva histórico)";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const env = await deleteFaixaSm(id, hard);
      applyEnvelope(env);
      if (editId === id) resetForm();
      push(hard ? "Faixa excluída." : "Faixa desativada.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao remover.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(id: number, dir: -1 | 1) {
    const idx = faixas.findIndex((f) => f.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= faixas.length) return;
    const ids = faixas.map((f) => f.id);
    const a = ids[idx]!;
    const b = ids[swap]!;
    ids[idx] = b;
    ids[swap] = a;
    setBusy(true);
    try {
      const env = await reorderFaixasSm(ids);
      applyEnvelope(env);
      push("Ordem atualizada.", "info");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao reordenar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Carregando faixas SM…</p>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Faixas de salário mínimo
        </h2>
        <p className="text-sm text-slate-500">
          Lista global ordenada + valor de referência do SM. Sem faixas
          ativas: inscrição baixa renda permitida, bloco socioeconómico
          incompleto (regra B).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {warnings.length > 0 || regraB ? (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <p
              key={`${w.code}-${i}`}
              className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              <span className="font-semibold">{w.code}:</span> {w.message}
            </p>
          ))}
          {regraB && warnings.length === 0 ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">FAIXAS_ATIVAS_VAZIAS:</span>{" "}
              Nenhuma faixa SM ativa (regra B).
            </p>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={onSaveSm}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3"
      >
        <div className="min-w-[12rem] flex-1">
          <Field label="SM de referência (R$)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={smRef}
              onChange={(e) => setSmRef(e.target.value)}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
        >
          Salvar SM
        </button>
      </form>

      <ul className="space-y-2">
        {faixas.map((f, index) => (
          <li
            key={f.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {f.ordem}. {f.rotulo}
              </p>
              <p className="text-xs text-slate-500">
                mult.{" "}
                {f.multiplicador_min != null ? f.multiplicador_min : "—"} –{" "}
                {f.multiplicador_max != null ? f.multiplicador_max : "—"}
              </p>
              <div className="mt-1">
                {f.ativo ? (
                  <StatusBadge label="Ativa" tone="green" />
                ) : (
                  <StatusBadge label="Inativa" tone="gray" />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={busy || index === 0}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => void move(f.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || index === faixas.length - 1}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => void move(f.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs"
                onClick={() => loadFaixa(f)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded border border-amber-200 px-2 py-1 text-xs text-amber-800"
                onClick={() => void onDelete(f.id, false)}
              >
                Desativar
              </button>
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() => void onDelete(f.id, true)}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
        {faixas.length === 0 ? (
          <li className="text-sm text-slate-500">
            Nenhuma faixa cadastrada.
          </li>
        ) : null}
      </ul>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          {editId != null ? `Editar faixa #${editId}` : "Nova faixa"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rótulo">
            <input
              className={inputClass}
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              required
            />
          </Field>
          <Toggle label="Ativa" checked={ativo} onChange={setAtivo} />
          <Field label="Multiplicador mínimo">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={multMin}
              onChange={(e) => setMultMin(e.target.value)}
              placeholder="opcional"
            />
          </Field>
          <Field label="Multiplicador máximo">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={multMax}
              onChange={(e) => setMultMax(e.target.value)}
              placeholder="opcional"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {editId != null ? "Salvar faixa" : "Adicionar faixa"}
          </button>
          {editId != null ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
