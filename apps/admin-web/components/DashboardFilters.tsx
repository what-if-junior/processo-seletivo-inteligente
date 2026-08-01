"use client";

import type { DashboardFilterState } from "../lib/dashboard-filters";
import { EMPTY_DASHBOARD_FILTERS } from "../lib/dashboard-filters";

export type FilterOption = { value: string; label: string };

const TURNOS: FilterOption[] = [
  { value: "MATUTINO", label: "Matutino" },
  { value: "VESPERTINO", label: "Vespertino" },
  { value: "NOTURNO", label: "Noturno" },
  { value: "INTEGRAL", label: "Integral" },
];

export function DashboardFilters({
  value,
  onChange,
  anos,
  campi,
  editais,
}: {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  anos: string[];
  campi: FilterOption[];
  editais: FilterOption[];
}) {
  const chips: { key: keyof DashboardFilterState; label: string }[] = [];
  if (value.ano) chips.push({ key: "ano", label: `Ano: ${value.ano}` });
  if (value.id_campus) {
    const c = campi.find((x) => x.value === value.id_campus);
    chips.push({ key: "id_campus", label: `Campus: ${c?.label ?? value.id_campus}` });
  }
  if (value.turno) {
    const t = TURNOS.find((x) => x.value === value.turno);
    chips.push({ key: "turno", label: `Turno: ${t?.label ?? value.turno}` });
  }
  if (value.id_edital) {
    const e = editais.find((x) => x.value === value.id_edital);
    chips.push({ key: "id_edital", label: `Edital: ${e?.label ?? value.id_edital}` });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Ano</span>
          <select
            value={value.ano}
            onChange={(e) => onChange({ ...value, ano: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Campus</span>
          <select
            value={value.id_campus}
            onChange={(e) => onChange({ ...value, id_campus: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os campi</option>
            {campi.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Turno</span>
          <select
            value={value.turno}
            onChange={(e) => onChange({ ...value, turno: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {TURNOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Edital <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <select
            value={value.id_edital}
            onChange={(e) => onChange({ ...value, id_edital: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os editais</option>
            {editais.map((ed) => (
              <option key={ed.value} value={ed.value}>
                {ed.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange({ ...value, [c.key]: "" })}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              {c.label} ×
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_DASHBOARD_FILTERS })}
            className="text-xs font-semibold text-[#2f9e41] hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </div>
  );
}
