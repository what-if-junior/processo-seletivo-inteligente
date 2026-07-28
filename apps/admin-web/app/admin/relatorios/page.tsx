"use client";

import { KpiCard } from "../../../components/KpiCard";
import { useToast } from "../../../components/ToastProvider";
import { downloadTextFile, formatNumber, toCsv } from "../../../lib/format";
import { useCandidatos, useInscricoes } from "../../../lib/hooks";
import { statusBucket, statusLabel } from "../../../lib/status";
import { downloadDashboardExport } from "../../../lib/w20-w25-api";
import { ApiError } from "../../../lib/api";

const REPORTS = [
  {
    id: "inscricoes",
    title: "Relatório de Inscrições",
    description: "Lista completa de candidaturas com status e processo.",
  },
  {
    id: "candidatos",
    title: "Relatório de Candidatos",
    description: "Contas de usuários e data de cadastro.",
  },
  {
    id: "status",
    title: "Relatório de Status",
    description: "Totais agregados por StatusCandidatura.",
  },
  {
    id: "geral",
    title: "Relatório Geral",
    description: "Resumo executivo de volumes e pendências.",
  },
] as const;

export default function RelatoriosPage() {
  const { data: inscricoes, source } = useInscricoes();
  const { data: candidatos } = useCandidatos();
  const { push } = useToast();

  const processosAbertos = new Set(inscricoes.map((i) => i.id_oferta)).size || 3;
  const pendentes = inscricoes.filter(
    (i) => statusBucket(i.status) === "em_analise",
  ).length;
  const finalizados = inscricoes.filter((i) => {
    const b = statusBucket(i.status);
    return b === "aprovada" || b === "rejeitada";
  }).length;

  function gerar(id: (typeof REPORTS)[number]["id"]) {
    const stamp = new Date().toISOString().slice(0, 10);
    if (id === "inscricoes") {
      downloadTextFile(
        `relatorio-inscricoes-${stamp}.csv`,
        toCsv(
          ["ID", "Candidato", "Processo", "Status", "Data"],
          inscricoes.map((i) => [
            String(i.id),
            i.usuario?.nome_completo ?? "",
            i.oferta?.curso?.nome ?? String(i.id_oferta),
            statusLabel(i.status),
            i.data_inscricao,
          ]),
        ),
      );
    } else if (id === "candidatos") {
      downloadTextFile(
        `relatorio-candidatos-${stamp}.csv`,
        toCsv(
          ["ID", "Nome", "Email", "Status", "Cadastro"],
          candidatos.map((c) => [
            String(c.id),
            c.nome,
            c.email,
            c.status,
            c.data_cadastro,
          ]),
        ),
      );
    } else if (id === "status") {
      const counts = new Map<string, number>();
      for (const i of inscricoes) {
        counts.set(i.status, (counts.get(i.status) ?? 0) + 1);
      }
      downloadTextFile(
        `relatorio-status-${stamp}.csv`,
        toCsv(
          ["Status", "Label", "Total"],
          [...counts.entries()].map(([status, total]) => [
            status,
            statusLabel(status),
            String(total),
          ]),
        ),
      );
    } else {
      downloadTextFile(
        `relatorio-geral-${stamp}.csv`,
        toCsv(
          ["Métrica", "Valor"],
          [
            ["Processos (cursos distintos)", String(processosAbertos)],
            ["Candidatos", String(candidatos.length)],
            ["Pendentes", String(pendentes)],
            ["Finalizados", String(finalizados)],
            ["Fonte", source],
          ],
        ),
      );
    }
    push("Relatório gerado (CSV no navegador).");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">
          Insights reativos a partir das listas disponíveis
          {source === "mock" ? " (dados de demonstração)" : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Processos Abertos" value={formatNumber(processosAbertos)} />
        <KpiCard title="Candidatos" value={formatNumber(candidatos.length || 0)} />
        <KpiCard title="Pendentes" value={formatNumber(pendentes)} />
        <KpiCard title="Finalizados" value={formatNumber(finalizados)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Dashboard CSV (API)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Export filtrável via GET /dashboard/export.csv (REQ-3.5).
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadDashboardExport({});
                  push("CSV do dashboard baixado da API.");
                } catch (e) {
                  push(
                    e instanceof ApiError
                      ? e.message
                      : "API indisponível para export.",
                    "error",
                  );
                }
              }}
              className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Baixar CSV (API)
            </button>
          </div>
        </article>
        {REPORTS.map((r) => (
          <article
            key={r.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">{r.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{r.description}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => gerar(r.id)}
                className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Gerar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
