"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EtapaStatusOverride,
  TipoEtapaCronograma,
} from "@repo/types";
import { ApiError } from "../lib/api";
import {
  createCronogramaEtapa,
  deleteCronogramaEtapa,
  fromLocalInputValue,
  listCronogramaGestao,
  reorderCronograma,
  toLocalInputValue,
  updateCronogramaEtapa,
  type CronogramaEtapa,
  type CronogramaWarning,
} from "../lib/cronograma-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass, Toggle } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "../lib/format";

const DEFAULT_TIPO = TipoEtapaCronograma.INSCRICAO;

export function CronogramaEditor({ editalId }: { editalId: number }) {
  const { push } = useToast();
  const [etapas, setEtapas] = useState<CronogramaEtapa[]>([]);
  const [warnings, setWarnings] = useState<CronogramaWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [tipo, setTipo] = useState<TipoEtapaCronograma>(DEFAULT_TIPO);
  const [nome, setNome] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [descricao, setDescricao] = useState("");
  const [override, setOverride] = useState<EtapaStatusOverride>(
    EtapaStatusOverride.AUTOMATICO,
  );
  const [impugnacao, setImpugnacao] = useState(false);
  const [recurso, setRecurso] = useState(false);
  const [templateId, setTemplateId] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCronogramaGestao(editalId);
      setEtapas(res.etapas);
      setWarnings(res.warnings ?? []);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Falha ao carregar cronograma.",
      );
    } finally {
      setLoading(false);
    }
  }, [editalId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetForm() {
    setEditId(null);
    setTipo(DEFAULT_TIPO);
    setNome("");
    setInicio("");
    setFim("");
    setDescricao("");
    setOverride(EtapaStatusOverride.AUTOMATICO);
    setImpugnacao(false);
    setRecurso(false);
    setTemplateId("");
  }

  function loadEtapa(etapa: CronogramaEtapa) {
    setEditId(etapa.id);
    setTipo(etapa.tipo);
    setNome(etapa.nome_exibido);
    setInicio(toLocalInputValue(String(etapa.data_inicio)));
    setFim(toLocalInputValue(String(etapa.data_fim)));
    setDescricao(etapa.descricao ?? "");
    setOverride(etapa.override);
    setImpugnacao(etapa.elegivel_impugnacao);
    setRecurso(etapa.elegivel_recurso);
    setTemplateId(
      etapa.template_instrucao_id != null
        ? String(etapa.template_instrucao_id)
        : "",
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inicio || !fim) {
      push("Informe data início e fim.", "error");
      return;
    }
    setBusy(true);
    const payload = {
      tipo,
      nome_exibido: nome.trim() || undefined,
      data_inicio: fromLocalInputValue(inicio),
      data_fim: fromLocalInputValue(fim),
      descricao: descricao.trim() || null,
      override,
      elegivel_impugnacao: impugnacao,
      elegivel_recurso: recurso,
      template_instrucao_id: templateId.trim()
        ? Number(templateId)
        : null,
    };
    try {
      if (editId != null) {
        await updateCronogramaEtapa(editalId, editId, payload);
        push("Etapa atualizada.");
      } else {
        await createCronogramaEtapa(editalId, payload);
        push("Etapa criada.");
      }
      resetForm();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar etapa.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Remover esta etapa?")) return;
    setBusy(true);
    try {
      await deleteCronogramaEtapa(editalId, id);
      if (editId === id) resetForm();
      push("Etapa removida.");
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

  async function move(id: number, dir: -1 | 1) {
    const idx = etapas.findIndex((e) => e.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= etapas.length) return;
    const ids = etapas.map((e) => e.id);
    const a = ids[idx]!;
    const b = ids[swap]!;
    ids[idx] = b;
    ids[swap] = a;
    setBusy(true);
    try {
      const res = await reorderCronograma(editalId, ids);
      setEtapas(res.etapas);
      setWarnings(res.warnings ?? []);
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
    return <p className="text-sm text-slate-500">Carregando cronograma…</p>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Cronograma</h2>
        <p className="text-sm text-slate-500">
          Etapas do catálogo, overrides e elegibilidade a contestação.
          Sobreposição de datas gera aviso (não bloqueia).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <p
              key={`${w.code}-${i}`}
              className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              <span className="font-semibold">{w.code}:</span> {w.message}
            </p>
          ))}
        </div>
      ) : null}

      <ul className="space-y-2">
        {etapas.map((etapa, index) => (
          <li
            key={etapa.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {etapa.ordem}. {etapa.nome_exibido}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({etapa.tipo})
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {formatDate(String(etapa.data_inicio))} —{" "}
                {formatDate(String(etapa.data_fim))} · {etapa.override}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {etapa.elegivel_impugnacao ? (
                  <StatusBadge label="Impugnação" tone="blue" />
                ) : null}
                {etapa.elegivel_recurso ? (
                  <StatusBadge label="Recurso" tone="blue" />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={busy || index === 0}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => void move(etapa.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || index === etapas.length - 1}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => void move(etapa.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs"
                onClick={() => loadEtapa(etapa)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() => void onDelete(etapa.id)}
              >
                Remover
              </button>
            </div>
          </li>
        ))}
        {etapas.length === 0 ? (
          <li className="text-sm text-slate-500">Nenhuma etapa cadastrada.</li>
        ) : null}
      </ul>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          {editId != null ? `Editar etapa #${editId}` : "Nova etapa"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo (catálogo)">
            <select
              className={inputClass}
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as TipoEtapaCronograma)
              }
            >
              {Object.values(TipoEtapaCronograma).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome exibido" hint="Opcional — usa rótulo do tipo">
            <input
              className={inputClass}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>
          <Field label="Data início">
            <input
              type="datetime-local"
              className={inputClass}
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
            />
          </Field>
          <Field label="Data fim">
            <input
              type="datetime-local"
              className={inputClass}
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              required
            />
          </Field>
          <Field label="Override de status">
            <select
              className={inputClass}
              value={override}
              onChange={(e) =>
                setOverride(e.target.value as EtapaStatusOverride)
              }
            >
              {Object.values(EtapaStatusOverride).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Template instrução (id)"
            hint="Biblioteca preenchida em W30 — id opcional por enquanto."
          >
            <input
              className={inputClass}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="opcional"
            />
          </Field>
        </div>
        <Field label="Descrição (links inline ok)">
          <textarea
            className={`${inputClass} min-h-20`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Elegível a impugnação"
            checked={impugnacao}
            onChange={setImpugnacao}
          />
          <Toggle
            label="Elegível a recurso"
            checked={recurso}
            onChange={setRecurso}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {editId != null ? "Salvar etapa" : "Adicionar etapa"}
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
