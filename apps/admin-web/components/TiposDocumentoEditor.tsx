"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BACKEND_UPLOAD_MAX_BYTES,
  CampoFormularioTipo,
  FaseDocumento,
  TIPO_COTA_VALUES,
} from "@repo/types";
import { ApiError } from "../lib/api";
import {
  createTipoDocumento,
  deleteTipoDocumento,
  listTiposDocumentoGestao,
  replaceTipoDocumentoCampos,
  updateTipoDocumento,
  uploadTipoDocumentoTemplate,
  type CampoPayload,
  type TipoDocumento,
  type TiposDocumentoWarning,
} from "../lib/tipos-documento-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass, Toggle } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";

type CampoDraft = {
  key: string;
  tipo: CampoFormularioTipo;
  rotulo: string;
  obrigatorio: boolean;
  formatos: string;
  tamanho_max_bytes: string;
};

function emptyCampo(): CampoDraft {
  return {
    key: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo: CampoFormularioTipo.TEXTO,
    rotulo: "",
    obrigatorio: false,
    formatos: "pdf",
    tamanho_max_bytes: String(BACKEND_UPLOAD_MAX_BYTES),
  };
}

function draftsFromTipo(tipo: TipoDocumento): CampoDraft[] {
  if (!tipo.campos.length) return [emptyCampo()];
  return tipo.campos
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((c) => ({
      key: `c-${c.id}`,
      tipo: c.tipo,
      rotulo: c.rotulo,
      obrigatorio: c.obrigatorio,
      formatos: (c.formatos ?? ["pdf"]).join(", "),
      tamanho_max_bytes:
        c.tamanho_max_bytes != null
          ? String(c.tamanho_max_bytes)
          : String(BACKEND_UPLOAD_MAX_BYTES),
    }));
}

function draftsToPayload(drafts: CampoDraft[]): CampoPayload[] {
  return drafts
    .filter((d) => d.rotulo.trim())
    .map((d, i) => {
      const base: CampoPayload = {
        tipo: d.tipo,
        rotulo: d.rotulo.trim(),
        obrigatorio: d.obrigatorio,
        ordem: i + 1,
      };
      if (d.tipo === CampoFormularioTipo.DOCUMENTO) {
        base.formatos = d.formatos
          .split(/[,\s]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const n = Number(d.tamanho_max_bytes);
        base.tamanho_max_bytes = Number.isFinite(n) && n > 0 ? n : null;
      }
      return base;
    });
}

export function TiposDocumentoEditor({ editalId }: { editalId: number }) {
  const { push } = useToast();
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [warnings, setWarnings] = useState<TiposDocumentoWarning[]>([]);
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
  const [tipoCota, setTipoCota] = useState("");
  const [campos, setCampos] = useState<CampoDraft[]>([emptyCampo()]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateNome, setTemplateNome] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTiposDocumentoGestao(editalId);
      setTipos(res.tipos);
      setWarnings(res.warnings ?? []);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Falha ao carregar tipos de documento.",
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
    setNome("");
    setDescricao("");
    setObrigatorio(true);
    setFormatos("pdf");
    setTamanhoMax(String(BACKEND_UPLOAD_MAX_BYTES));
    setFase(FaseDocumento.INSCRICAO);
    setTipoCota("");
    setCampos([emptyCampo()]);
    setTemplateFile(null);
    setTemplateNome(null);
  }

  function loadTipo(tipo: TipoDocumento) {
    setEditId(tipo.id);
    setNome(tipo.nome);
    setDescricao(tipo.descricao ?? "");
    setObrigatorio(tipo.obrigatorio);
    setFormatos(tipo.formatos.join(", "));
    setTamanhoMax(String(tipo.tamanho_max_bytes));
    setFase(tipo.fase);
    setTipoCota(tipo.tipo_cota ?? "");
    setCampos(draftsFromTipo(tipo));
    setTemplateFile(null);
    setTemplateNome(tipo.template_nome ?? null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      push("Informe o nome do tipo de documento.", "error");
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
      tipo_cota: tipoCota.trim() || null,
    };
    try {
      let saved: TipoDocumento;
      if (editId != null) {
        saved = await updateTipoDocumento(editalId, editId, payload);
        push("Tipo de documento atualizado.");
      } else {
        saved = await createTipoDocumento(editalId, payload);
        push("Tipo de documento criado.");
      }

      const campoPayload = draftsToPayload(campos);
      saved = await replaceTipoDocumentoCampos(
        editalId,
        saved.id,
        campoPayload,
      );

      if (templateFile) {
        saved = await uploadTipoDocumentoTemplate(
          editalId,
          saved.id,
          templateFile,
        );
      }

      if (saved.warnings?.length) {
        setWarnings(saved.warnings);
      }
      resetForm();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar tipo.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number, herdado: boolean) {
    const msg = herdado
      ? "Desvincular este tipo herdado do processo? O tipo base da conta permanece; só remove a cópia neste edital."
      : "Remover este tipo extra do processo?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const deleted = await deleteTipoDocumento(editalId, id);
      if (deleted.warnings?.length) setWarnings(deleted.warnings);
      if (editId === id) resetForm();
      push(herdado ? "Tipo desvinculado do processo." : "Tipo removido.");
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

  function updateCampo(key: string, patch: Partial<CampoDraft>) {
    setCampos((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Carregando tipos de documento…</p>
    );
  }

  const herdados = tipos.filter((t) => t.herdado);
  const extras = tipos.filter((t) => !t.herdado);

  function renderTipoRow(tipo: TipoDocumento) {
    const isHerdado = Boolean(tipo.herdado);
    return (
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
            {tipo.tipo_cota ? ` · cota ${tipo.tipo_cota}` : " · edital"}
            {tipo.campos.length ? ` · ${tipo.campos.length} campo(s)` : ""}
            {tipo.id_tipo_base != null
              ? ` · base #${tipo.id_tipo_base}`
              : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {isHerdado ? (
              <StatusBadge label="Herdado" tone="blue" />
            ) : (
              <StatusBadge label="Extra" tone="gray" />
            )}
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
            className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
            title={
              isHerdado
                ? "Desvincula do edital; o tipo base da conta permanece"
                : "Remove o tipo extra deste edital"
            }
            onClick={() => void onDelete(tipo.id, isHerdado)}
          >
            {isHerdado ? "Desvincular" : "Remover"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Tipos de documento
        </h2>
        <p className="text-sm text-slate-500">
          Herdados da conta vs extras deste edital. Desvincular remove só a
          cópia no processo (REQ-1.5). Alterar o catálogo com inscrições gera
          aviso (não bloqueia).
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
              {w.inscricoes_count != null
                ? ` (${w.inscricoes_count} inscrição(ões))`
                : ""}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Herdados da conta ({herdados.length})
          </h3>
          <ul className="space-y-2">
            {herdados.map(renderTipoRow)}
            {herdados.length === 0 ? (
              <li className="text-sm text-slate-500">
                Nenhum tipo herdado neste processo.
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Extras do edital ({extras.length})
          </h3>
          <ul className="space-y-2">
            {extras.map(renderTipoRow)}
            {extras.length === 0 ? (
              <li className="text-sm text-slate-500">
                Nenhum tipo extra — use o formulário abaixo para adicionar.
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          {editId != null ? `Editar tipo #${editId}` : "Novo tipo (extra)"}
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
          <Field
            label="Cota (opcional)"
            hint="Vazio = aplica-se a todo o edital"
          >
            <select
              className={inputClass}
              value={tipoCota}
              onChange={(e) => setTipoCota(e.target.value)}
            >
              <option value="">Todo o edital</option>
              {TIPO_COTA_VALUES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
        </div>
        <Field label="Descrição">
          <textarea
            className={`${inputClass} min-h-16`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </Field>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">
              Construtor de campos
            </h4>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              onClick={() => setCampos((prev) => [...prev, emptyCampo()])}
            >
              + Campo
            </button>
          </div>
          {campos.map((c, index) => (
            <div
              key={c.key}
              className="grid gap-2 rounded border border-slate-100 bg-slate-50 p-2 sm:grid-cols-6"
            >
              <Field label={`#${index + 1} Tipo`}>
                <select
                  className={inputClass}
                  value={c.tipo}
                  onChange={(e) =>
                    updateCampo(c.key, {
                      tipo: e.target.value as CampoFormularioTipo,
                    })
                  }
                >
                  {Object.values(CampoFormularioTipo).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Rótulo">
                  <input
                    className={inputClass}
                    value={c.rotulo}
                    onChange={(e) =>
                      updateCampo(c.key, { rotulo: e.target.value })
                    }
                  />
                </Field>
              </div>
              {c.tipo === CampoFormularioTipo.DOCUMENTO ? (
                <>
                  <Field label="Formatos">
                    <input
                      className={inputClass}
                      value={c.formatos}
                      onChange={(e) =>
                        updateCampo(c.key, { formatos: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Max bytes">
                    <input
                      type="number"
                      className={inputClass}
                      value={c.tamanho_max_bytes}
                      onChange={(e) =>
                        updateCampo(c.key, {
                          tamanho_max_bytes: e.target.value,
                        })
                      }
                    />
                  </Field>
                </>
              ) : (
                <div className="sm:col-span-2" />
              )}
              <div className="flex flex-col justify-end gap-1">
                <Toggle
                  label="Obrigatório"
                  checked={c.obrigatorio}
                  onChange={(v) => updateCampo(c.key, { obrigatorio: v })}
                />
                <button
                  type="button"
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                  onClick={() =>
                    setCampos((prev) =>
                      prev.length <= 1
                        ? [emptyCampo()]
                        : prev.filter((x) => x.key !== c.key),
                    )
                  }
                >
                  Remover campo
                </button>
              </div>
            </div>
          ))}
        </div>

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
            {editId != null ? "Salvar tipo" : "Adicionar tipo"}
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
