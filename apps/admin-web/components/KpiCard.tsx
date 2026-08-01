export function KpiCard({
  title,
  value,
  delta,
  hint,
}: {
  title: string;
  value: string;
  delta?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" title={hint}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {delta ? (
        <p className="mt-1 text-xs font-medium text-emerald-600">{delta}</p>
      ) : null}
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
