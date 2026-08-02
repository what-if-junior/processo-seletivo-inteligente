"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusDocumento, type StatusCandidatura } from "@repo/types";
import { StatusBadge } from "../../../../components/StatusBadge";
import { useToast } from "../../../../components/ToastProvider";
import { ApiError } from "../../../../lib/api";
import { formatDate } from "../../../../lib/format";
import {
  decidirDocumento,
  downloadDocumentoArquivo,
  fetchMotivosHomologacao,
  patchCandidaturaAdmin,
  type MotivoHomologacao,
} from "../../../../lib/homologacao-api";
import { useInscricao } from "../../../../lib/hooks";
import {
  ADMIN_STATUS_ACTIONS,
  STATUS_DOCUMENTO_LABELS,
  statusLabel,
  statusTone,
} from "../../../../lib/status";

export default function InscricaoDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data, setData, source, loading, error } = useInscricao(id);
  const { push } = useToast();
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  const [motivos, setMotivos] = useState<MotivoHomologacao[]>([]);
  const [motivoId, setMotivoId] = useState<number | "">("");
  const [motivoLivre, setMotivoLivre] = useState("");

  useEffect(() => {
    if (data?.observacoes_admin != null) {
      setObs(data.observacoes_admin);
    }
  }, [data?.id, data?.observacoes_admin]);

  useEffect(() => {
    void fetchMotivosHomologacao()
      .then(setMotivos)
      .catch(() => setMotivos([]));
  }, []);

  async function applyStatus(target: StatusCandidatura, label: string) {
    if (!data) return;
    setBusy(true);
    try {
      await patchCandidaturaAdmin(data.id, { status: target });
      setData({ ...data, status: target });
      push(`Status atualizado para ${label}.`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `PATCH /candidaturas/${data.id} falhou (HTTP ${e.status}).`
          : `Não foi possível persistir o status.`;
      push(msg, "info");
    } finally {
      setBusy(false);
    }
  }

  async function saveObs() {
    if (!data) return;
    setBusy(true);
    try {
      await patchCandidaturaAdmin(data.id, { observacoes_admin: obs });
      setData({ ...data, observacoes_admin: obs });
      push("Observações salvas.");
    } catch (e) {
      push(
        e instanceof ApiError
          ? `Falha ao salvar observações (HTTP ${e.status}).`
          : "Falha ao salvar observações.",
        "info",
      );
    } finally {
      setBusy(false);
    }
  }

  async function baixarDoc(docId: number, nome: string) {
    try {
      const blob = await downloadDocumentoArquivo(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      push(`Download de “${nome}” falhou.`, "info");
    }
  }

  async function decidirDoc(
    docId: number,
    status: StatusDocumento.APROVADO | StatusDocumento.REPROVADO,
  ) {
    if (!data) return;
    if (status === StatusDocumento.REPROVADO && !motivoId) {
      push("Selecione um motivo de catálogo para rejeitar.", "info");
      return;
    }
    setBusy(true);
    try {
      const updated = await decidirDocumento(docId, {
        status,
        id_motivo:
          status === StatusDocumento.REPROVADO
            ? Number(motivoId)
            : undefined,
        motivo_livre: motivoLivre.trim() || undefined,
      });
      setData({
        ...data,
        documentos: (data.documentos ?? []).map((d) =>
          d.id === docId
            ? {
                ...d,
                status_documento: updated.status_documento,
                id_motivo: updated.id_motivo,
                motivo_livre: updated.motivo_livre,
              }
            : d,
        ),
      });
      push(
        status === StatusDocumento.APROVADO
          ? "Documento homologado."
          : "Documento rejeitado.",
      );
    } catch (e) {
      push(
        e instanceof ApiError
          ? `Decisão falhou (HTTP ${e.status}).`
          : "Decisão falhou.",
        "info",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando inscrição…</p>;
  }

  if (error || !data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">
          {error ?? "Inscrição não encontrada."}
        </p>
        <Link href="/admin/inscricoes" className="text-sm text-[#2f9e41]">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/inscricoes"
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            ← Inscrições
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Inscrição #{data.id}
          </h1>
          <p className="text-sm text-slate-500">
            Fonte: {source} ·{" "}
            <Link
              href="/admin/homologacao"
              className="text-[#2f9e41] hover:underline"
            >
              Fila de homologação
            </Link>
          </p>
        </div>
        <StatusBadge
          label={statusLabel(String(data.status))}
          tone={statusTone(String(data.status))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Candidato</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome" value={data.usuario?.nome_completo} />
            <Field label="E-mail" value={data.usuario?.email} />
            <Field label="CPF" value={data.usuario?.CPF} />
            <Field label="Telefone" value={data.usuario?.telefone} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Académico</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Curso" value={data.oferta?.curso?.nome} />
            <Field
              label="Ano de conclusão"
              value={data.ano_conclusao ?? "—"}
            />
            <Field
              label="Necessidades especiais"
              value={data.necessidades_especiais ?? (data.usuario?.pcd ? "PcD" : "—")}
            />
            <Field label="Campus" value={data.oferta?.campus?.nome} />
            <Field label="Turno" value={data.oferta?.turno} />
            <Field label="Data de envio" value={formatDate(data.data_inscricao)} />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Documentos</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-slate-400">
              Motivo (rejeição)
            </span>
            <select
              value={motivoId}
              onChange={(e) =>
                setMotivoId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {m.descricao}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-slate-400">
              Texto livre
            </span>
            <input
              value={motivoLivre}
              onChange={(e) => setMotivoLivre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Opcional / obrigatório se OUTRO"
            />
          </label>
        </div>
        {(data.documentos?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Nenhum documento anexado.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.documentos?.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {doc.tipo_documento}
                  </p>
                  <p className="text-xs text-slate-500">
                    {doc.nome_arquivo} ·{" "}
                    {STATUS_DOCUMENTO_LABELS[String(doc.status_documento)] ??
                      String(doc.status_documento)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void baixarDoc(doc.id, doc.nome_arquivo)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Baixar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void decidirDoc(doc.id, StatusDocumento.APROVADO)
                    }
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Homologar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void decidirDoc(doc.id, StatusDocumento.REPROVADO)
                    }
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Rejeitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Ações administrativas</h2>
        <div className="flex flex-wrap gap-2">
          {ADMIN_STATUS_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={busy}
              onClick={() => applyStatus(action.target, action.label)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                action.tone === "green"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : action.tone === "red"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Mapeamento: Aprovar → <code>aprovado</code>, Rejeitar →{" "}
          <code>reprovado</code>, Marcar em Revisão → <code>analise_documental</code>.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Observações Administrativas</h2>
        <textarea
          rows={4}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2f9e41]"
          placeholder="Registre notas da homologação…"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveObs()}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Salvar
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || "—"}</dd>
    </div>
  );
}
