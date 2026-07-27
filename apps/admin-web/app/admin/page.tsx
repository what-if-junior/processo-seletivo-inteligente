"use client";

import { useMemo } from "react";
import { KpiCard } from "../../components/KpiCard";
import { useInscricoes, useCandidatos } from "../../lib/hooks";
import { formatNumber } from "../../lib/format";
import { MOCK_ATIVIDADE, MOCK_MONTHLY } from "../../lib/mocks";
import { statusBucket, statusLabel, statusTone } from "../../lib/status";
import type { BadgeTone } from "../../lib/status";

const DOT: Record<BadgeTone, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-slate-400",
  blue: "bg-sky-500",
};

export default function AdminDashboardPage() {
  const { data: inscricoes, source, loading, error } = useInscricoes();
  const { data: candidatos } = useCandidatos();

  const kpis = useMemo(() => {
    const total = inscricoes.length;
    const emAnalise = inscricoes.filter(
      (i) => statusBucket(i.status) === "em_analise",
    ).length;
    const aprovadas = inscricoes.filter(
      (i) => statusBucket(i.status) === "aprovada",
    ).length;
    const rejeitadas = inscricoes.filter(
      (i) => statusBucket(i.status) === "rejeitada",
    ).length;
    const ativos =
      candidatos.filter((c) => c.status === "ativo").length || candidatos.length;

    const useDemoScale = source === "mock" && total < 50;
    return {
      total: useDemoScale ? 1247 : total,
      emAnalise: useDemoScale ? 89 : emAnalise,
      aprovadas: useDemoScale ? 856 : aprovadas,
      rejeitadas: useDemoScale ? 302 : rejeitadas,
      ativos: useDemoScale ? 2341 : ativos,
    };
  }, [inscricoes, candidatos, source]);

  const monthly = MOCK_MONTHLY;
  const max = Math.max(...monthly.map((m) => m.total), 1);

  const recent =
    source === "api" && inscricoes.length
      ? inscricoes.slice(0, 5).map((i) => ({
          id: i.id,
          texto: `${i.usuario?.nome_completo ?? "Candidato"} — ${statusLabel(i.status)}`,
          quando: i.data_inscricao,
          tone: statusTone(i.status),
        }))
      : MOCK_ATIVIDADE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Visão geral das inscrições e candidatos
          {source === "mock" ? " (dados de demonstração)" : ""}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando métricas…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Total Inscrições"
            value={formatNumber(kpis.total)}
            delta="+12% MoM"
          />
          <KpiCard
            title="Em Análise"
            value={formatNumber(kpis.emAnalise)}
            delta="+3% MoM"
          />
          <KpiCard
            title="Aprovadas"
            value={formatNumber(kpis.aprovadas)}
            delta="+8% MoM"
          />
          <KpiCard
            title="Rejeitadas"
            value={formatNumber(kpis.rejeitadas)}
            delta="-2% MoM"
          />
          <KpiCard
            title="Candidatos Ativos"
            value={formatNumber(kpis.ativos)}
            delta="+5% MoM"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Inscrições por Mês
          </h2>
          <div className="flex h-56 items-end gap-3">
            {monthly.map((m) => (
              <div key={m.mes} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-[#2f9e41]/70 transition hover:bg-[#2f9e41]"
                  style={{ height: `${(m.total / max) * 100}%` }}
                  title={`${m.total}`}
                />
                <span className="text-xs text-slate-500">{m.mes}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Série mensal ainda sem endpoint dedicado — valores ilustrativos.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Atividade Recente
          </h2>
          <ul className="space-y-3">
            {recent.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[item.tone]}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{item.texto}</p>
                  <p className="text-xs text-slate-400">{item.quando}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
