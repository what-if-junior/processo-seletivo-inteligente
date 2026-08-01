export type DashboardFilterState = {
  ano: string;
  id_campus: string;
  turno: string;
  id_edital: string;
};

export const EMPTY_DASHBOARD_FILTERS: DashboardFilterState = {
  ano: "",
  id_campus: "",
  turno: "",
  id_edital: "",
};

export function filtersToParams(
  filters: DashboardFilterState,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.ano) out.ano = filters.ano;
  if (filters.id_campus) out.id_campus = filters.id_campus;
  if (filters.turno) out.turno = filters.turno;
  if (filters.id_edital) out.id_edital = filters.id_edital;
  return out;
}

export function filtersToSearchParams(filters: DashboardFilterState): string {
  const qs = new URLSearchParams(filtersToParams(filters));
  return qs.toString();
}

export function parseFiltersFromSearch(
  search: string | URLSearchParams,
): DashboardFilterState {
  const qs =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return {
    ano: qs.get("ano") ?? "",
    id_campus: qs.get("id_campus") ?? "",
    turno: qs.get("turno") ?? "",
    id_edital: qs.get("id_edital") ?? "",
  };
}

/** Default ano = current calendar year when that year exists in options. */
export function defaultAno(anos: string[], now = new Date()): string {
  const y = String(now.getFullYear());
  return anos.includes(y) ? y : anos[0] ?? y;
}

export function anosFromEditais(
  editais: Array<{ numero_ano?: string | null }>,
): string[] {
  const set = new Set<string>();
  for (const e of editais) {
    const raw = (e.numero_ano ?? "").trim();
    if (!raw) continue;
    const m = /(\d{4})/.exec(raw);
    if (m?.[1]) set.add(m[1]);
    else set.add(raw);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}
