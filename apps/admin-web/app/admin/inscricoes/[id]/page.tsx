"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "../../../../components/StatusBadge";
import { useToast } from "../../../../components/ToastProvider";
import { apiFetch, ApiError } from "../../../../lib/api";
import { formatDate } from "../../../../lib/format";
import { useInscricao } from "../../../../lib/hooks";
import {
  ADMIN_STATUS_ACTIONS,
  STATUS_DOCUMENTO_LABELS,
  statusLabel,
  statusTone,
} from "../../../../lib/status";
import type { StatusCandidatura } from "@repo/types";

export default function InscricaoDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data, setData, source, loading, error } = useInscricao(id);
  const { push } = useToast();
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.observacoes_admin != null) {
      setObs(data.observacoes_admin);
    }
  }, [data?.id, data?.observacoes_admin]);

  async function applyStatus(target: StatusCandidatura, label: string) {
    if (!data) return;
    setBusy(true);
    try {
      // TODO(API): PATCH /candidaturas/:id { status } — endpoint ainda não existe
      await apiFetch(`/candidaturas/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: target }),
      });
      setData({ ...data, status: target });
      push(`Status atualizado para ${label}.`);
    } catch (e) {
      // Optimistic local update for demo UX when API lacks PATCH
      setData({ ...data, status: target });
      const msg =
        e instanceof ApiError
          ? `PATCH /candidaturas/${data.id} indisponível (HTTP ${e.status}). Status atualizado só nesta sessão (TODO backend).`
          : `Não foi possível persistir o status. Atualizado só nesta sessão (TODO backend).`;
      push(msg, "info");
    } finally {
      setBusy(false);
    }
  }

  function saveObs() {
    if (!data) return;
    setData({ ...data, observacoes_admin: obs });
    // TODO(API): sem endpoint de observações administrativas
    push(
      "Observações salvas localmente. Persistência no backend ainda não disponível.",
      "info",
    );
  }

  function baixarDoc(nome: string) {
    push(`Download de “${nome}” ainda não disponível (binário fora do JSON).`, "info");
  }

  function verificarDoc(nome: string) {
    push(
      `Verificação de “${nome}” requer PATCH /documentos (ainda não implementado).`,
      "info",
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando inscrição…</p>;
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error ?? "Inscrição não encontrada."}</p>
        <Link href="/admin/inscricoes" className="text-sm text-blue-600">
          Voltar para a lista
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
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Voltar
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Inscrição #{data.id}
          </h1>
          <p className="text-sm text-slate-500">
            {data.curso?.nome ?? `Curso #${data.id_curso}`}
            {source === "mock" ? " · dados de demonstração" : ""}
          </p>
        </div>
        <StatusBadge label={statusLabel(data.status)} tone={statusTone(data.status)} />
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Dados do candidato</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Nome" value={data.usuario?.nome_completo} />
            <Field label="E-mail" value={data.usuario?.email} />
            <Field label="Telefone" value={data.usuario?.telefone} />
            <Field label="CPF" value={data.usuario?.CPF} />
            <Field
              label="Data de nascimento"
              value={formatDate(data.usuario?.data_nascimento)}
            />
            <Field label="Tipo de vaga" value={data.tipo_vaga} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Dados acadêmicos</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Escola" value={data.escola ?? "— (não no schema atual)"} />
            <Field
              label="Ano de conclusão"
              value={data.ano_conclusao ?? "—"}
            />
            <Field
              label="Necessidades especiais"
              value={data.necessidades_especiais ?? (data.usuario?.pcd ? "PcD" : "—")}
            />
            <Field label="Campus" value={data.curso?.campus} />
            <Field label="Turno" value={data.curso?.turno} />
            <Field label="Data de envio" value={formatDate(data.data_inscricao)} />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Documentos</h2>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => baixarDoc(doc.nome_arquivo)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Baixar
                  </button>
                  <button
                    type="button"
                    onClick={() => verificarDoc(doc.nome_arquivo)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Verificar
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
            onClick={saveObs}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
