"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../components/DataTable";
import { KpiCard } from "../../components/KpiCard";
import { useToast } from "../../components/ToastProvider";
import { ApiError } from "../../lib/api";
import { formatNumber } from "../../lib/format";
import {
  downloadDashboardExport,
  getDashboardInsights,
  type DashboardInsights,
} from "../../lib/w20-w25-api";

export default function AdminDashboardPage() {
  const { push } = useToast();
  const [ano, setAno] = useState("");
  const [idCampus, setIdCampus] = useState("");
  const [turno, setTurno] = useState("");
  const [idEdital, setIdEdital] = useState("");
  const [data, setData] = useState<DashboardInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(
    () => ({
      ano,
      id_campus: idCampus,
      turno,
      id_edital: idEdital,
    }),
    [ano, idCampus, turno, idEdital],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const insights = await getDashboardInsights(filters);
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
  }, [filters]);

  const maxCampus = Math.max(
    ...(data?.byCampus.map((c) => c.inscritos) ?? [0]),
    1,
  );
  const acInsc = data?.acVsCotas.ac.inscritos ?? 0;
  const cotasInsc = data?.acVsCotas.cotas.inscritos ?? 0;
  const acCotasMax = Math.max(acInsc, cotasInsc, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Insights reativos — REQ-3.5 (ano, campus, turno, edital)
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          onClick={async () => {
            try {
              await downloadDashboardExport(filters);
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

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Ano</span>
          <input
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder="2024"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Campus (id)
          </span>
          <input
            value={idCampus}
            onChange={(e) => setIdCampus(e.target.value)}
            placeholder="1"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Turno</span>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="MATUTINO">Matutino</option>
            <option value="VESPERTINO">Vespertino</option>
            <option value="NOTURNO">Noturno</option>
            <option value="INTEGRAL">Integral</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Edital (id)
          </span>
          <input
            value={idEdital}
            onChange={(e) => setIdEdital(e.target.value)}
            placeholder="1"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

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
              {a.mensagem}
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando métricas…</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Inscritos"
              value={formatNumber(data.cards.inscritos)}
            />
            <KpiCard
              title="Vagas ofertadas"
              value={formatNumber(data.cards.vagas)}
            />
            <KpiCard
              title="Convocados"
              value={formatNumber(data.cards.convocados)}
            />
            <KpiCard
              title="Matriculados"
              value={formatNumber(data.cards.matriculados)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Inscritos por campus
              </h2>
              <div className="flex h-48 items-end gap-2">
                {data.byCampus.map((c) => (
                  <div
                    key={c.id_campus}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full rounded-t-md bg-[#2f9e41]/70"
                      style={{
                        height: `${(c.inscritos / maxCampus) * 100}%`,
                      }}
                      title={`${c.campus}: ${c.inscritos}`}
                    />
                    <span className="max-w-full truncate text-xs text-slate-500">
                      {c.campus}
                    </span>
                  </div>
                ))}
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
                    <div
                      className="w-full max-w-[80px] rounded-t-md bg-sky-500/70"
                      style={{ height: `${(b.value / acCotasMax) * 100}%` }}
                    />
                    <span className="text-xs text-slate-500">
                      {b.label}: {b.value}
                    </span>
                  </div>
                ))}
              </div>
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
              </tr>
            ))}
          </DataTable>
        </>
      ) : null}
    </div>
  );
}
