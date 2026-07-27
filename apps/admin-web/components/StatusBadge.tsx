import type { BadgeTone } from "../lib/status";

const TONE: Record<BadgeTone, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-sky-100 text-sky-800",
};

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}
    >
      {label}
    </span>
  );
}
