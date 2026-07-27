export function KpiCard({
  title,
  value,
  delta,
}: {
  title: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {delta ? (
        <p className="mt-1 text-xs font-medium text-emerald-600">{delta}</p>
      ) : null}
    </div>
  );
}
