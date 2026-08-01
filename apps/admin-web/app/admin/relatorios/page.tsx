"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardFilters } from "../../../components/DashboardFilters";
import { KpiCard } from "../../../components/KpiCard";
import { useToast } from "../../../components/ToastProvider";
import { ApiError } from "../../../lib/api";
import {
  anosFromEditais,
  defaultAno,
  filtersToParams,
  filtersToSearchParams,
  parseFiltersFromSearch,
  type DashboardFilterState,
} from "../../../lib/dashboard-filters";
import { formatNumber } from "../../../lib/format";
import {
  listCampusCatalog,
  listEditaisGestao,
} from "../../../lib/processos-api";
import {
  downloadDashboardExport,
  getDashboardInsights,
  type DashboardInsights,
} from "../../../lib/w20-w25-api";

const PRESETS: {
  id: string;
  title: string;
  description: string;
  apply: (f: DashboardFilterState) => DashboardFilterState;
}[] = [
  {
    id: "ciclo",
    title: "Ciclo atual (ano)",
    description: "Mantém o ano selecionado e limpa campus/turno/edital.",
    apply: (f) => ({ ...f, id_campus: "", turno: "", id_edital: "" }),
  },
  {
    id: "todos",
    title: "Visão global",
    description: "Remove todos os filtros e exporta o recorte amplo.",
    apply: () => ({ ano: "", id_campus: "", turno: "", id_edital: "" }),
  },
];

function RelatoriosInner() {
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;
    const qs = filtersToSearchParams(filters);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, ready, pathname, router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const insights = await getDashboardInsights(filtersToParams(filters));
        if (!cancelled) setData(insights);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, ready]);

  const maxCampus = Math.max(
    ...(data?.byCampus.map((c) => c.inscritos) ?? [0]),
    1,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">
          Presets e gráficos a partir de GET /dashboard/insights (mesmos filtros do painel)
        </p>
      </div>

      <DashboardFilters
        value={filters}
        onChange={setFilters}
        anos={anos}
        campi={campi}
        editais={editais}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Inscritos"
          value={formatNumber(data?.cards.inscritos ?? 0)}
        />
        <KpiCard
          title="Convocados"
          value={formatNumber(data?.cards.convocados ?? 0)}
          hint="Aprovados sem matrícula no campus"
        />
        <KpiCard
          title="Matriculados"
          value={formatNumber(data?.cards.matriculados ?? 0)}
          hint="Confirmados como alunos no campus"
        />
        <KpiCard
          title="Taxa efetivação"
          value={`${Number(data?.cards.taxa_conversao ?? 0).toFixed(1)}%`}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Inscritos por campus (filtro atual)
        </h2>
        <div className="flex h-40 items-end gap-2">
          {(data?.byCampus ?? []).map((c) => (
            <div key={c.id_campus} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold">{c.inscritos}</span>
              <div
                className="w-full rounded-t-md bg-[#2f9e41]/70"
                style={{
                  height: `${(c.inscritos / maxCampus) * 100}%`,
                  minHeight: c.inscritos ? 4 : 0,
                }}
              />
              <span className="max-w-full truncate text-[10px] text-slate-500">
                {c.campus}
              </span>
            </div>
          ))}
          {!data?.byCampus?.length ? (
            <p className="text-sm text-slate-500">Sem dados.</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {PRESETS.map((p) => (
          <article
            key={p.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900">{p.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{p.description}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilters(p.apply(filters))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = p.apply(filters);
                  setFilters(next);
                  try {
                    await downloadDashboardExport(filtersToParams(next));
                    push("CSV do preset baixado.");
                  } catch (e) {
                    push(
                      e instanceof ApiError ? e.message : "Falha no export.",
                      "error",
                    );
                  }
                }}
                className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Exportar CSV
              </button>
            </div>
          </article>
        ))}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Exportar recorte atual
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mesmo CSV do dashboard com os filtros da barra acima.
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadDashboardExport(filtersToParams(filters));
                  push("CSV baixado.");
                } catch (e) {
                  push(
                    e instanceof ApiError ? e.message : "Falha no export.",
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
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}>
      <RelatoriosInner />
    </Suspense>
  );
}
