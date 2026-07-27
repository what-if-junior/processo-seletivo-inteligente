"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError } from "../../../../lib/api";
import { createEdital } from "../../../../lib/processos-api";
import { useToast } from "../../../../components/ToastProvider";
import {
  ProcessoFormFields,
  emptyProcessoForm,
  toCreatePayload,
  type ProcessoFormState,
} from "../../../../components/ProcessoFormFields";

export default function NovoProcessoPage() {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState<ProcessoFormState>(emptyProcessoForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toCreatePayload(form);
      if (!payload.numero_ano || !payload.termos_valor) {
        throw new Error("Número/ano e termos são obrigatórios.");
      }
      const created = await createEdital(payload);
      push("Processo criado como rascunho.");
      router.push(`/admin/processos/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Falha ao criar processo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Novo processo seletivo
        </h1>
        <p className="text-sm text-slate-500">
          Rascunho: publique só após enviar o PDF do edital. Link oficial é
          opcional.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <ProcessoFormFields form={form} onChange={setForm} disabled={saving} />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/processos")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Criar rascunho"}
          </button>
        </div>
      </form>
    </div>
  );
}
