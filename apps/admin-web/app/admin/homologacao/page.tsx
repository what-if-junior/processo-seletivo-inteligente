"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusDocumento } from "@repo/types";
import { useToast } from "../../../components/ToastProvider";
import { ApiError } from "../../../lib/api";
import {
  decidirDocumento,
  decidirDocumentosLote,
  downloadDocumentoArquivo,
  fetchFilaHomologacao,
  fetchMotivosHomologacao,
  type FilaDocumento,
  type MotivoHomologacao,
} from "../../../lib/homologacao-api";
import { STATUS_DOCUMENTO_LABELS } from "../../../lib/status";

export default function HomologacaoPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<FilaDocumento[]>([]);
  const [motivos, setMotivos] = useState<MotivoHomologacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [edital, setEdital] = useState("");
  const [status, setStatus] = useState(StatusDocumento.EM_ANALISE);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [motivoId, setMotivoId] = useState<number | "">("");
  const [motivoLivre, setMotivoLivre] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  const selectedMotivo = useMemo(
    () => motivos.find((m) => m.id === motivoId) ?? null,
    [motivos, motivoId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [fila, cats] = await Promise.all([
        fetchFilaHomologacao({
          edital: edital ? Number(edital) : undefined,
          status: status || undefined,
        }),
        fetchMotivosHomologacao(),
      ]);
      setRows(fila);
      setMotivos(cats);
      setSelected(new Set());
    } catch (e: unknown) {
      push(
        e instanceof ApiError
          ? `Falha ao carregar fila (HTTP ${e.status}).`
          : "Falha ao carregar fila de homologação.",
        "info",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [edital, status, push]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function preview(doc: FilaDocumento) {
    try {
      const blob = await downloadDocumentoArquivo(doc.id);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewName(doc.nome_arquivo);
    } catch {
      push("Não foi possível pré-visualizar o arquivo.", "info");
    }
  }

  async function decideOne(
    id: number,
    target: StatusDocumento.APROVADO | StatusDocumento.REPROVADO,
  ) {
    if (target === StatusDocumento.REPROVADO && !motivoId) {
      push("Selecione um motivo de catálogo para rejeitar.", "info");
      return;
    }
    if (
      target === StatusDocumento.REPROVADO &&
      selectedMotivo?.exige_texto_livre &&
      !motivoLivre.trim()
    ) {
      push("Este motivo exige texto livre.", "info");
      return;
    }
    setBusy(true);
    try {
      await decidirDocumento(id, {
        status: target,
        id_motivo:
          target === StatusDocumento.REPROVADO
            ? Number(motivoId)
            : undefined,
        motivo_livre: motivoLivre.trim() || undefined,
      });
      push(
        target === StatusDocumento.APROVADO
          ? "Documento homologado."
          : "Documento rejeitado.",
      );
      await reload();
    } catch (e: unknown) {
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

  async function decideBatch(
    target: StatusDocumento.APROVADO | StatusDocumento.REPROVADO,
  ) {
    const ids = [...selected];
    if (!ids.length) {
      push("Selecione documentos para decisão em lote.", "info");
      return;
    }
    if (target === StatusDocumento.REPROVADO && !motivoId) {
      push("Selecione um motivo de catálogo para rejeição em lote.", "info");
      return;
    }
    setBusy(true);
    try {
      const res = await decidirDocumentosLote({
        ids,
        status: target,
        id_motivo:
          target === StatusDocumento.REPROVADO
            ? Number(motivoId)
            : undefined,
        motivo_livre: motivoLivre.trim() || undefined,
      });
      push(`Lote: ${res.updated} documento(s) atualizados.`);
      await reload();
    } catch (e: unknown) {
      push(
        e instanceof ApiError
          ? `Lote falhou (HTTP ${e.status}).`
          : "Lote falhou.",
        "info",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Homologação documental
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Fila humana por edital — motivos de catálogo; sem rejeição automática
            por IA.
          </p>
        </div>
        <Link
          href="/admin/inscricoes"
          className="text-sm font-medium text-[#2f9e41] hover:underline"
        >
          Ver inscrições
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-slate-400">
              Edital ID
            </span>
            <input
              value={edital}
              onChange={(e) => setEdital(e.target.value)}
              placeholder="Todos"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-slate-400">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusDocumento)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={StatusDocumento.EM_ANALISE}>Em análise</option>
              <option value={StatusDocumento.APROVADO}>Homologado</option>
              <option value={StatusDocumento.REPROVADO}>Rejeitado</option>
              <option value={StatusDocumento.REVISAO_MANUAL}>
                Revisão manual
              </option>
              <option value="all">Todos</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Filtrar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase text-slate-400">
              Motivo (catálogo)
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
              placeholder="Opcional (obrigatório se motivo OUTRO)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void decideBatch(StatusDocumento.APROVADO)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Homologar lote
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decideBatch(StatusDocumento.REPROVADO)}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Rejeitar lote
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Carregando fila…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhum documento na fila.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2"> </th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Candidato</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => toggle(doc.id)}
                      aria-label={`Selecionar documento ${doc.id}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">
                      {doc.tipo_documento}
                    </p>
                    <p className="text-xs text-slate-500">
                      #{doc.id} · {doc.nome_arquivo}
                      {doc.sugestao_ia ? " · sugestão IA (não decide)" : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{doc.candidatura?.usuario?.nome ?? "—"}</p>
                    <p className="text-xs text-slate-500">
                      Inscrição{" "}
                      <Link
                        href={`/admin/inscricoes/${doc.id_candidatura}`}
                        className="text-[#2f9e41] hover:underline"
                      >
                        #{doc.id_candidatura}
                      </Link>
                      {doc.candidatura?.id_edital
                        ? ` · edital ${doc.candidatura.id_edital}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {STATUS_DOCUMENTO_LABELS[String(doc.status_documento)] ??
                      doc.status_documento}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void preview(doc)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void decideOne(doc.id, StatusDocumento.APROVADO)
                        }
                        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Homologar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void decideOne(doc.id, StatusDocumento.REPROVADO)
                        }
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {previewUrl && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Preview — {previewName}</h2>
            <button
              type="button"
              className="text-xs text-slate-500 hover:underline"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
            >
              Fechar
            </button>
          </div>
          {previewName.toLowerCase().endsWith(".pdf") ? (
            <iframe title="preview" src={previewUrl} className="h-96 w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={previewName}
              className="max-h-96 rounded-lg border border-slate-200"
            />
          )}
        </section>
      )}
    </div>
  );
}
