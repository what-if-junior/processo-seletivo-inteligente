"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DashboardFilters } from "../../components/DashboardFilters";
import { DataTable } from "../../components/DataTable";
import { KpiCard } from "../../components/KpiCard";
import { useToast } from "../../components/ToastProvider";
import { ApiError } from "../../lib/api";
import {
  anosFromEditais,
  defaultAno,
  filtersToParams,
  filtersToSearchParams,
  parseFiltersFromSearch,
  type DashboardFilterState,
} from "../../lib/dashboard-filters";
import { formatNumber } from "../../lib/format";
import {
  listCampusCatalog,
  listEditaisGestao,
} from "../../lib/processos-api";
import {
  downloadDashboardExport,
  getDashboardInsights,
  type DashboardInsights,
} from "../../lib/w20-w25-api";

function formatPct(n: number): string {
  return `${Number(n).toFixed(1)}%`;
}

function AdminDashboardPage() {
  const { push } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<DashboardFilterState>(() =>
    parseFiltersFromSearch(searchParams.toString()),
  );
  const [anos, setAnos] = useState<string[]>([]);
  const [campi, setCampi] = useState<{ value: string; label: string }[]>([]);
  const [editais, setEditais] = useState<{ value: string; label: string }[]>([]);
  const [data, setData] = useState<DashboardInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsReady, setOptionsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [campusList, editalList] = await Promise.all([
          listCampusCatalog().catch(() => []),
          listEditaisGestao().catch(() => []),
        ]);
        if (cancelled) return;
        const yearOpts = anosFromEditais(editalList);
        setAnos(yearOpts);
        setCampi(
          campusList.map((c) => ({
            value: String(c.id),
            label: c.nome ?? `Campus ${c.id}`,
          })),
        );
        setEditais(
          editalList.map((e) => ({
            value: String(e.id),
            label: e.numero_ano || `Edital #${e.id}`,
          })),
        );
        setFilters((prev) => {
          if (prev.ano || searchParams.get("ano")) return prev;
          return { ...prev, ano: defaultAno(yearOpts) };
        });
      } finally {
        if (!cancelled) setOptionsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!optionsReady) return;
    const qs = filtersToSearchParams(filters);
    const next = qs ? `${pathname}?${qs}` : pathname;
    router.replace(next, { scroll: false });
  }, [filters, optionsReady, pathname, router]);

  useEffect(() => {
    if (!optionsReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const insights = await getDashboardInsights(filtersToParams(filters));
        if (cancelled) return;
        setData(insights);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(
          e instanceof ApiError
            ? `API indisponível (${e.status}).`
            : "API indisponível.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, optionsReady]);

  const maxCampus = Math.max(
    ...(data?.byCampus.map((c) => c.inscritos) ?? [0]),
    1,
  );
  const acInsc = data?.acVsCotas.ac.inscritos ?? 0;
  const cotasInsc = data?.acVsCotas.cotas.inscritos ?? 0;
  const acCotasMax = Math.max(acInsc, cotasInsc, 1);

  const candidatosPorVaga = useMemo(() => {
    const v = data?.cards.vagas ?? 0;
    const i = data?.cards.inscritos ?? 0;
    if (!v) return "—";
    return (i / v).toFixed(2);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Insights reativos — REQ-3.5 (ano, campus, turno; edital opcional)
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          onClick={async () => {
            try {
              await downloadDashboardExport(filtersToParams(filters));
              push("CSV exportado.");
            } catch (e) {
              push(
                e instanceof ApiError ? e.message : "Falha no export CSV.",
                "error",
              );
            }
          }}
        >
          Exportar CSV
        </button>
      </div>

      <DashboardFilters
        value={filters}
        onChange={setFilters}
        anos={anos}
        campi={campi}
        editais={editais}
      />

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {data?.alerts?.length ? (
        <ul className="space-y-2">
          {data.alerts.map((a, idx) => (
            <li
              key={`${a.mensagem}-${idx}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                a.nivel === "critico"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {a.id_oferta ? (
                <Link
                  href={`/admin/chamadas?id_oferta=${a.id_oferta}&${filtersToSearchParams(filters)}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {a.mensagem}
                </Link>
              ) : (
                a.mensagem
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando métricas…</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Inscritos" value={formatNumber(data.cards.inscritos)} />
            <KpiCard
              title="Vagas ofertadas"
              value={formatNumber(data.cards.vagas)}
            />
            <KpiCard
              title="Candidatos / vaga"
              value={candidatosPorVaga}
              hint="Inscritos ÷ vagas ofertadas"
            />
            <KpiCard
              title="Ofertas"
              value={formatNumber(data.cards.ofertas)}
            />
            <KpiCard
              title="Convocados"
              value={formatNumber(data.cards.convocados)}
              hint="Aprovados no processo sem matrícula no campus"
            />
            <KpiCard
              title="Matriculados"
              value={formatNumber(data.cards.matriculados)}
              hint="Aprovados que confirmaram inscrição como alunos no campus"
            />
            <KpiCard
              title="Taxa de efetivação"
              value={formatPct(data.cards.taxa_conversao)}
              hint="Matriculados ÷ (convocados + matriculados)"
            />
            <KpiCard
              title="Taxa de ocupação"
              value={formatPct(data.cards.taxa_ocupacao)}
              hint="Matriculados ÷ vagas ofertadas"
            />
            <KpiCard
              title="Vagas ociosas"
              value={formatNumber(data.cards.vagas_ociosas)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Inscritos por campus
              </h2>
              <div className="flex h-48 items-end gap-2">
                {data.byCampus.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem dados para o filtro.</p>
                ) : (
                  data.byCampus.map((c) => (
                    <div
                      key={c.id_campus}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        {c.inscritos}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-[#2f9e41]/70"
                        style={{
                          height: `${(c.inscritos / maxCampus) * 100}%`,
                          minHeight: c.inscritos ? 4 : 0,
                        }}
                        title={`${c.campus}: ${c.inscritos}`}
                      />
                      <span className="max-w-full truncate text-xs text-slate-500">
                        {c.campus}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                AC vs cotas (inscritos)
              </h2>
              <div className="flex h-48 items-end gap-8 px-8">
                {[
                  { label: "AC", value: acInsc },
                  { label: "Cotas", value: cotasInsc },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {b.value}
                    </span>
                    <div
                      className="w-full max-w-[80px] rounded-t-md bg-sky-500/70"
                      style={{
                        height: `${(b.value / acCotasMax) * 100}%`,
                        minHeight: b.value ? 4 : 0,
                      }}
                    />
                    <span className="text-xs text-slate-500">{b.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Convocados AC {data.acVsCotas.ac.convocados} · matriculados{" "}
                {data.acVsCotas.ac.matriculados} · Cotas convocados{" "}
                {data.acVsCotas.cotas.convocados} · matriculados{" "}
                {data.acVsCotas.cotas.matriculados}
              </p>
            </section>
          </div>

          <DataTable
            headers={[
              "Edital",
              "Campus",
              "Curso",
              "Turno",
              "Inscritos",
              "Vagas",
              "Convocados",
              "Matriculados",
              "Ociosas",
              "",
            ]}
          >
            {data.table.map((r) => (
              <tr key={r.id_oferta} className="hover:bg-slate-50">
                <td className="px-4 py-2">{r.edital}</td>
                <td className="px-4 py-2">{r.campus}</td>
                <td className="px-4 py-2">{r.curso}</td>
                <td className="px-4 py-2">{r.turno}</td>
                <td className="px-4 py-2">{r.inscritos}</td>
                <td className="px-4 py-2">{r.vagas}</td>
                <td className="px-4 py-2">{r.convocados}</td>
                <td className="px-4 py-2">{r.matriculados}</td>
                <td className="px-4 py-2">{r.vagas_ociosas}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/chamadas?id_oferta=${r.id_oferta}&${filtersToSearchParams(filters)}`}
                    className="text-sm font-semibold text-[#2f9e41] hover:underline"
                  >
                    Chamadas
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </>
      ) : null}
    </div>
  );
}


export default function AdminDashboardPageSuspense() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando dashboard…</p>}>
      <AdminDashboardPage />
    </Suspense>
  );
}
