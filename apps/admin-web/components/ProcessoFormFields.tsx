"use client";

import {
  MetodoSelecao,
  MeritoTipo,
  TermosModo,
  type Edital,
} from "@repo/types";
import type { CreateEditalPayload } from "../lib/processos-api";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f9e41]";

export const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export type ProcessoFormState = {
  numero_ano: string;
  metodo_selecao: MetodoSelecao;
  merito_tipo: MeritoTipo | "";
  is_simplificado: boolean;
  fallback_ac_para_rv: boolean;
  termos_modo: TermosModo;
  termos_valor: string;
  link_oficial: string;
};

export function emptyProcessoForm(): ProcessoFormState {
  return {
    numero_ano: "",
    metodo_selecao: MetodoSelecao.ALEATORIO,
    merito_tipo: "",
    is_simplificado: false,
    fallback_ac_para_rv: false,
    termos_modo: TermosModo.URL,
    termos_valor: "",
    link_oficial: "",
  };
}

export function formFromEdital(edital: Edital): ProcessoFormState {
  return {
    numero_ano: edital.numero_ano,
    metodo_selecao: edital.metodo_selecao,
    merito_tipo: edital.merito_tipo ?? "",
    is_simplificado: edital.is_simplificado,
    fallback_ac_para_rv: edital.fallback_ac_para_rv,
    termos_modo: edital.termos_modo,
    termos_valor: edital.termos_valor,
    link_oficial: edital.link_oficial ?? "",
  };
}

export function toCreatePayload(form: ProcessoFormState): CreateEditalPayload {
  const needsMerito =
    form.metodo_selecao === MetodoSelecao.MERITO ||
    form.metodo_selecao === MetodoSelecao.HIBRIDO;

  return {
    numero_ano: form.numero_ano.trim(),
    metodo_selecao: form.metodo_selecao,
    merito_tipo: needsMerito && form.merito_tipo ? form.merito_tipo : null,
    is_simplificado: form.is_simplificado,
    fallback_ac_para_rv: form.fallback_ac_para_rv,
    termos_modo: form.termos_modo,
    termos_valor: form.termos_valor.trim(),
    link_oficial: form.link_oficial.trim() || null,
  };
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
            checked ? "bg-[#2f9e41]" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

type Props = {
  form: ProcessoFormState;
  onChange: (next: ProcessoFormState) => void;
  disabled?: boolean;
};

export function ProcessoFormFields({ form, onChange, disabled }: Props) {
  const needsMerito =
    form.metodo_selecao === MetodoSelecao.MERITO ||
    form.metodo_selecao === MetodoSelecao.HIBRIDO;

  function set<K extends keyof ProcessoFormState>(
    key: K,
    value: ProcessoFormState[K],
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="space-y-4">
      <Field label="Número / ano" hint="Ex.: 001/2026">
        <input
          className={inputClass}
          value={form.numero_ano}
          disabled={disabled}
          onChange={(e) => set("numero_ano", e.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Método de seleção"
          hint="ALEATORIO = sorteio; MERITO / HIBRIDO usam mérito_tipo."
        >
          <select
            className={inputClass}
            value={form.metodo_selecao}
            disabled={disabled}
            onChange={(e) =>
              set("metodo_selecao", e.target.value as MetodoSelecao)
            }
          >
            {Object.values(MetodoSelecao).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Tipo de mérito"
          hint={
            needsMerito
              ? "Obrigatório para MERITO e para a 2ª etapa de HIBRIDO."
              : "Só aplicável a MERITO / HIBRIDO."
          }
        >
          <select
            className={inputClass}
            value={form.merito_tipo}
            disabled={disabled || !needsMerito}
            onChange={(e) =>
              set("merito_tipo", e.target.value as MeritoTipo | "")
            }
          >
            <option value="">—</option>
            {Object.values(MeritoTipo).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Toggle
        label="Processo simplificado (is_simplificado)"
        checked={form.is_simplificado}
        disabled={disabled}
        onChange={(v) => set("is_simplificado", v)}
        hint="Formato administrativo (menos burocracia / etapas). Independente do método de seleção — não é um método concorrente ao sorteio."
      />

      <Toggle
        label="Fallback AC → RV (fallback_ac_para_rv)"
        checked={form.fallback_ac_para_rv}
        disabled={disabled}
        onChange={(v) => set("fallback_ac_para_rv", v)}
        hint="Quando ativo, cotistas são avaliados primeiro na ampla concorrência (Fluxo L); se não colocados em AC, seguem para a fila da reserva. O motor de classificação é W23 — aqui só a flag."
      />

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-800">
          Termos de aceitação (um modo)
        </legend>
        <p className="text-xs text-slate-500">
          Escolha exatamente um: PDF (referência), URL de PDF, ou texto rico.
        </p>
        <div className="flex flex-wrap gap-4">
          {Object.values(TermosModo).map((modo) => (
            <label
              key={modo}
              className="inline-flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="radio"
                name="termos_modo"
                value={modo}
                checked={form.termos_modo === modo}
                disabled={disabled}
                onChange={() => set("termos_modo", modo)}
              />
              {modo}
            </label>
          ))}
        </div>
        {form.termos_modo === TermosModo.TEXTO ? (
          <textarea
            className={`${inputClass} min-h-28`}
            value={form.termos_valor}
            disabled={disabled}
            onChange={(e) => set("termos_valor", e.target.value)}
            placeholder="Texto dos termos…"
            required
          />
        ) : (
          <input
            className={inputClass}
            value={form.termos_valor}
            disabled={disabled}
            onChange={(e) => set("termos_valor", e.target.value)}
            placeholder={
              form.termos_modo === TermosModo.URL
                ? "https://…/termos.pdf"
                : "caminho ou referência do PDF de termos"
            }
            required
          />
        )}
      </fieldset>

      <Field
        label="Link da publicação oficial (opcional)"
        hint="Pode ficar vazio e ser preenchido depois."
      >
        <input
          className={inputClass}
          value={form.link_oficial}
          disabled={disabled}
          onChange={(e) => set("link_oficial", e.target.value)}
          placeholder="https://www.ifb.edu.br/…"
        />
      </Field>
    </div>
  );
}
