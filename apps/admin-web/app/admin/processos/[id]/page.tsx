"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Edital, EditalArquivoMeta } from "@repo/types";
import { ApiError, getAccessToken, getApiBaseUrl } from "../../../lib/api";
import {
  getEditalGestao,
  listEditalArquivos,
  updateEdital,
  uploadEditalPdf,
} from "../../../lib/processos-api";
import { useToast } from "../../../components/ToastProvider";
import {
  ProcessoFormFields,
  Toggle,
  formFromEdital,
  toCreatePayload,
  type ProcessoFormState,
} from "../../../components/ProcessoFormFields";
import { OfertasEditor } from "../../../components/OfertasEditor";
import { CronogramaEditor } from "../../../components/CronogramaEditor";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatDate } from "../../../lib/format";

export default function ProcessoDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { push } = useToast();

  const [edital, setEdital] = useState<Edital | null>(null);
  const [form, setForm] = useState<ProcessoFormState | null>(null);
  const [arquivos, setArquivos] = useState<EditalArquivoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const reload = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    try {
      const [e, arcs] = await Promise.all([
        getEditalGestao(id),
        listEditalArquivos(id),
      ]);
      setEdital(e);
      setForm(formFromEdital(e));
      setArquivos(arcs);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o processo.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const updated = await updateEdital(id, toCreatePayload(form));
      setEdital(updated);
      setForm(formFromEdital(updated));
      push("Dados do processo salvos.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      await uploadEditalPdf(id, file);
      setFile(null);
      push("PDF enviado — agora é o vigente.");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro no upload.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setFlag(
    patch: { publicado?: boolean; inscricoes_abertas?: boolean },
  ) {
    setSaving(true);
    try {
      const updated = await updateEdital(id, patch);
      setEdital(updated);
      setForm(formFromEdital(updated));
      push("Status atualizado.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao atualizar status.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openArquivo(arquivoId: number) {
    try {
      const headers = new Headers();
      const token = getAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(
        `${getApiBaseUrl()}/editais/${id}/arquivos/${arquivoId}`,
        { headers },
      );
      if (!res.ok) throw new Error(`Download falhou (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      push(err instanceof Error ? err.message : "Erro ao abrir PDF.", "error");
    }
  }

  if (loading || !form || !edital) {
    return (
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Carregando processo…</p>
        )}
        <Link href="/admin/processos" className="text-sm text-[#2f9e41]">
          ← Voltar
        </Link>
      </div>
    );
  }

  const hasPdf = arquivos.length > 0;
  const publishHint = !hasPdf
    ? "Envie ao menos um PDF do edital antes de publicar."
    : !edital.termos_valor?.trim()
      ? "Termos obrigatórios antes de publicar."
      : undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/processos"
            className="text-sm text-[#2f9e41] hover:underline"
          >
            ← Processos
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {edital.numero_ano}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge
              label={edital.publicado ? "Publicado" : "Rascunho"}
              tone={edital.publicado ? "green" : "yellow"}
            />
            <StatusBadge
              label={
                edital.inscricoes_abertas
                  ? "Inscrições abertas"
                  : "Inscrições fechadas"
              }
              tone={edital.inscricoes_abertas ? "green" : "gray"}
            />
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Publicação</h2>
        <Toggle
          label="Publicado (visível no catálogo público)"
          checked={edital.publicado}
          disabled={saving || (!edital.publicado && !hasPdf)}
          onChange={(v) => void setFlag({ publicado: v })}
          hint={publishHint}
        />
        <Toggle
          label="Inscrições abertas"
          checked={edital.inscricoes_abertas}
          disabled={saving || (!edital.inscricoes_abertas && !hasPdf)}
          onChange={(v) => void setFlag({ inscricoes_abertas: v })}
          hint="Candidatos só se inscrevem após publicação/abertura."
        />
      </section>

      <form
        onSubmit={onSave}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">Dados gerais</h2>
        <ProcessoFormFields form={form} onChange={setForm} disabled={saving} />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            PDFs do edital
          </h2>
          <p className="text-sm text-slate-500">
            Histórico retido; o último enviado é o vigente.
          </p>
        </div>
        <form onSubmit={onUpload} className="flex flex-wrap items-end gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={!file || saving}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            Enviar PDF
          </button>
        </form>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {arquivos.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="text-slate-700">
                PDF #{a.id} · {formatDate(String(a.criado_em))}
              </span>
              <div className="flex items-center gap-2">
                {a.vigente ? (
                  <StatusBadge label="Vigente" tone="green" />
                ) : (
                  <StatusBadge label="Histórico" tone="gray" />
                )}
                <button
                  type="button"
                  className="text-[#2f9e41] hover:underline"
                  onClick={() => void openArquivo(a.id)}
                >
                  Abrir
                </button>
              </div>
            </li>
          ))}
          {arquivos.length === 0 ? (
            <li className="px-3 py-4 text-sm text-slate-500">
              Nenhum PDF — obrigatório para publicar.
            </li>
          ) : null}
        </ul>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <OfertasEditor editalId={id} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <CronogramaEditor editalId={id} />
      </div>
    </div>
  );
}
