"use client";

import { useCallback, useEffect, useState } from "react";
import { BACKEND_UPLOAD_MAX_BYTES, FaseDocumento } from "@repo/types";
import { ApiError } from "../lib/api";
import {
  createTipoDocumentoBase,
  deleteTipoDocumentoBase,
  listTiposDocumentoBaseGestao,
  updateTipoDocumentoBase,
  uploadTipoDocumentoBaseTemplate,
  type TipoDocumentoBase,
} from "../lib/tipos-documento-base-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass, Toggle } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";

export function TiposDocumentoBaseEditor() {
  const { push } = useToast();
  const [tipos, setTipos] = useState<TipoDocumentoBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [obrigatorio, setObrigatorio] = useState(true);
  const [formatos, setFormatos] = useState("pdf");
  const [tamanhoMax, setTamanhoMax] = useState(String(BACKEND_UPLOAD_MAX_BYTES));
  const [fase, setFase] = useState<FaseDocumento>(FaseDocumento.INSCRICAO);
  const [ativo, setAtivo] = useState(true);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateNome, setTemplateNome] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTiposDocumentoBaseGestao();
      setTipos(res.tipos.slice().sort((a, b) => a.ordem - b.ordem));
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Falha ao carregar tipos base da conta.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetForm() {
    setEditId(null);
    setNome("");
    setDescricao("");
    setObrigatorio(true);
    setFormatos("pdf");
    setTamanhoMax(String(BACKEND_UPLOAD_MAX_BYTES));
    setFase(FaseDocumento.INSCRICAO);
    setAtivo(true);
    setTemplateFile(null);
    setTemplateNome(null);
  }

  function loadTipo(tipo: TipoDocumentoBase) {
    setEditId(tipo.id);
    setNome(tipo.nome);
    setDescricao(tipo.descricao ?? "");
    setObrigatorio(tipo.obrigatorio);
    setFormatos(tipo.formatos.join(", "));
    setTamanhoMax(String(tipo.tamanho_max_bytes));
    setFase(tipo.fase);
    setAtivo(tipo.ativo);
    setTemplateFile(null);
    setTemplateNome(tipo.template_nome ?? null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      push("Informe o nome do tipo base.", "error");
      return;
    }
    const tamanho = Number(tamanhoMax);
    if (!Number.isFinite(tamanho) || tamanho <= 0) {
      push("Tamanho máximo inválido.", "error");
      return;
    }
    setBusy(true);
    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      obrigatorio,
      formatos: formatos
        .split(/[,\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      tamanho_max_bytes: tamanho,
      fase,
      ativo,
    };
    try {
      let saved: TipoDocumentoBase;
      if (editId != null) {
        saved = await updateTipoDocumentoBase(editId, payload);
        push("Tipo base atualizado.");
      } else {
        saved = await createTipoDocumentoBase(payload);
        push("Tipo base criado.");
      }
      if (templateFile) {
        await uploadTipoDocumentoBaseTemplate(saved.id, templateFile);
        push("Template enviado.");
      }
      resetForm();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar tipo base.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(tipo: TipoDocumentoBase) {
    if (tipo.vinculados_count > 0) {
      push(
        `TIPO_BASE_VINCULADO: não é possível remover «${tipo.nome}» enquanto houver ${tipo.vinculados_count} vínculo(s) em editais. Desvincule no processo primeiro.`,
        "error",
      );
      return;
    }
    if (
      !window.confirm(
        `Remover o tipo base «${tipo.nome}»? Esta ação é permanente. Se houver ficheiros em Meus Dados, a API também bloqueia (409).`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteTipoDocumentoBase(tipo.id);
      if (editId === tipo.id) resetForm();
      push("Tipo base removido.");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError
          ? err.message
          : "Erro ao remover tipo base (pode estar vinculado).",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Carregando tipos base da conta…</p>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Documentação base da conta
        </h2>
        <p className="text-sm text-slate-500">
          Tipos herdados por novos processos (desmarcáveis na criação). Remoção
          bloqueada enquanto houver vínculo em editais ou ficheiros em Meus
          Dados (REQ-1.5).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {tipos.map((tipo) => (
          <li
            key={tipo.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {tipo.ordem}. {tipo.nome}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({tipo.fase})
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {tipo.obrigatorio ? "Obrigatório" : "Opcional"} ·{" "}
                {tipo.formatos.join(", ")} · max {tipo.tamanho_max_bytes} B
                {tipo.vinculados_count > 0
                  ? ` · ${tipo.vinculados_count} vínculo(s)`
                  : " · sem vínculos"}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {tipo.ativo ? (
                  <StatusBadge label="Ativo" tone="green" />
                ) : (
                  <StatusBadge label="Inativo" tone="gray" />
                )}
                {tipo.vinculados_count > 0 ? (
                  <StatusBadge label="Vinculado" tone="blue" />
                ) : null}
                {tipo.template_nome ? (
                  <StatusBadge label="Template" tone="green" />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs"
                onClick={() => loadTipo(tipo)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 disabled:opacity-50"
                disabled={tipo.vinculados_count > 0}
                title={
                  tipo.vinculados_count > 0
                    ? "Remoção bloqueada: desvincule nos editais primeiro"
                    : "Remover tipo base"
                }
                onClick={() => void onDelete(tipo)}
              >
                Remover
              </button>
            </div>
          </li>
        ))}
        {tipos.length === 0 ? (
          <li className="text-sm text-slate-500">
            Nenhum tipo base cadastrado. Novos processos não herdarão
            documentação até criar tipos ativos.
          </li>
        ) : null}
      </ul>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          {editId != null ? `Editar tipo base #${editId}` : "Novo tipo base"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <input
              className={inputClass}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </Field>
          <Field label="Fase">
            <select
              className={inputClass}
              value={fase}
              onChange={(e) => setFase(e.target.value as FaseDocumento)}
            >
              {Object.values(FaseDocumento).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Formatos" hint="Separados por vírgula">
            <input
              className={inputClass}
              value={formatos}
              onChange={(e) => setFormatos(e.target.value)}
            />
          </Field>
          <Field
            label="Tamanho máx. (bytes)"
            hint={`Teto backend: ${BACKEND_UPLOAD_MAX_BYTES}`}
          >
            <input
              type="number"
              min={1}
              max={BACKEND_UPLOAD_MAX_BYTES}
              className={inputClass}
              value={tamanhoMax}
              onChange={(e) => setTamanhoMax(e.target.value)}
            />
          </Field>
          <Toggle
            label="Documento obrigatório"
            checked={obrigatorio}
            onChange={setObrigatorio}
          />
          <Toggle label="Ativo (herdável)" checked={ativo} onChange={setAtivo} />
        </div>
        <Field label="Descrição">
          <textarea
            className={`${inputClass} min-h-16`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </Field>
        <Field
          label="Template (docx etc.)"
          hint={
            templateNome
              ? `Atual: ${templateNome}`
              : "Opcional — enviado após salvar o tipo"
          }
        >
          <input
            type="file"
            className="text-sm"
            onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {editId != null ? "Salvar tipo base" : "Adicionar tipo base"}
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
