"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  checkboxLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: (notificarCandidatos: boolean) => void;
  onCancel: () => void;
};

export function ConfirmNotifyModal({
  open,
  title,
  description,
  checkboxLabel = "Enviar notificação aos candidatos desta fase / coorte afetada",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const [notificar, setNotificar] = useState(true);

  useEffect(() => {
    if (open) setNotificar(true);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#2f9e41]"
            checked={notificar}
            disabled={busy}
            onChange={(e) => setNotificar(e.target.checked)}
          />
          <span>{checkboxLabel}</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(notificar)}
            className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {busy ? "Aplicando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
