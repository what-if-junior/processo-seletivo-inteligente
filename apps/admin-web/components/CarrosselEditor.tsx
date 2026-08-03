"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/api";
import {
  createCarrosselManual,
  deleteCarrosselItem,
  listCarrosselGestao,
  patchAutoHabilitado,
  reorderCarrossel,
  sincronizarCarrosselAuto,
  updateCarrosselItem,
  type CarrosselItem,
} from "../lib/carrossel-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass, Toggle } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";

type FormState = {
  titulo: string;
  rotulo: string;
  subtitulo: string;
  cta_texto: string;
  cta_link: string;
  imagem_url: string;
  icone: string;
  id_edital: string;
  ativo: boolean;
  inicio_em: string;
  fim_em: string;
};

const EMPTY_FORM: FormState = {
  titulo: "",
  rotulo: "",
  subtitulo: "",
  cta_texto: "",
  cta_link: "",
  imagem_url: "",
  icone: "GraduationCap",
  id_edital: "",
  ativo: true,
  inicio_em: "",
  fim_em: "",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CarrosselEditor() {
  const { push } = useToast();
  const [items, setItems] = useState<CarrosselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const manuais = useMemo(
    () => items.filter((i) => i.tipo === "manual"),
    [items],
  );
  const automaticos = useMemo(
    () => items.filter((i) => i.tipo === "auto_edital"),
    [items],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listCarrosselGestao();
      setItems(list.slice().sort((a, b) => a.ordem - b.ordem || a.id - b.id));
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Falha ao carregar itens do carrossel.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetForm() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(item: CarrosselItem) {
    setEditId(item.id);
    setForm({
      titulo: item.titulo,
      rotulo: item.rotulo ?? "",
      subtitulo: item.subtitulo ?? "",
      cta_texto: item.cta_texto ?? "",
      cta_link: item.cta_link ?? "",
      imagem_url: item.imagem_url ?? "",
      icone: item.icone ?? "GraduationCap",
      id_edital: item.id_edital != null ? String(item.id_edital) : "",
      ativo: item.ativo,
      inicio_em: toDatetimeLocal(item.inicio_em),
      fim_em: toDatetimeLocal(item.fim_em),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) {
      push("Informe o título.", "error");
      return;
    }
    const idEdital = form.id_edital.trim()
      ? Number(form.id_edital)
      : null;
    if (form.id_edital.trim() && !Number.isFinite(idEdital)) {
      push("id_edital inválido.", "error");
      return;
    }

    const payload = {
      titulo: form.titulo.trim(),
      rotulo: form.rotulo.trim() || null,
      subtitulo: form.subtitulo.trim() || null,
      cta_texto: form.cta_texto.trim() || null,
      cta_link: form.cta_link.trim() || null,
      imagem_url: form.imagem_url.trim() || null,
      icone: form.icone.trim() || "GraduationCap",
      ativo: form.ativo,
      inicio_em: fromDatetimeLocal(form.inicio_em),
      fim_em: fromDatetimeLocal(form.fim_em),
      ...(editId == null ||
      items.find((i) => i.id === editId)?.tipo === "manual"
        ? { id_edital: idEdital }
        : {}),
    };

    setBusy(true);
    try {
      if (editId != null) {
        await updateCarrosselItem(editId, payload);
        push("Item atualizado.");
      } else {
        await createCarrosselManual(payload);
        push("Item manual criado.");
      }
      resetForm();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar item.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number, hard: boolean) {
    const msg = hard
      ? "Excluir permanentemente este item manual?"
      : "Desativar este item (soft)?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const list = await deleteCarrosselItem(id, hard);
      setItems(list.slice().sort((a, b) => a.ordem - b.ordem || a.id - b.id));
      if (editId === id) resetForm();
      push(hard ? "Item excluído." : "Item desativado.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao remover.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(id: number, dir: -1 | 1) {
    const idx = items.findIndex((f) => f.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= items.length) return;
    const ids = items.map((f) => f.id);
    const a = ids[idx]!;
    const b = ids[swap]!;
    ids[idx] = b;
    ids[swap] = a;
    setBusy(true);
    try {
      const list = await reorderCarrossel(ids);
      setItems(list.slice().sort((a, b) => a.ordem - b.ordem || a.id - b.id));
      push("Ordem atualizada.", "info");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao reordenar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onToggleAuto(id: number, value: boolean) {
    setBusy(true);
    try {
      await patchAutoHabilitado(id, value);
      await reload();
      push(value ? "Auto habilitado." : "Auto desabilitado.");
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao alterar toggle.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSync() {
    setBusy(true);
    try {
      const r = await sincronizarCarrosselAuto();
      await reload();
      push(
        `Sync: ${r.created} criados, ${r.updated} atualizados, ${r.skipped_disabled} desabilitados preservados.`,
      );
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao sincronizar.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando carrossel…</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Carrossel</h2>
          <p className="text-sm text-slate-500">
            Banner da Home do candidato — itens manuais, automáticos por edital
            aberto e ordenação global via API.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSync()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          Sincronizar editais abertos
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 className="text-sm font-semibold text-slate-800">
          {editId != null ? `Editar #${editId}` : "Novo item manual"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título *">
            <input
              className={inputClass}
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </Field>
          <Field label="Rótulo">
            <input
              className={inputClass}
              value={form.rotulo}
              onChange={(e) => setForm({ ...form, rotulo: e.target.value })}
            />
          </Field>
          <Field label="Subtítulo">
            <input
              className={inputClass}
              value={form.subtitulo}
              onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
            />
          </Field>
          <Field label="CTA texto">
            <input
              className={inputClass}
              value={form.cta_texto}
              onChange={(e) => setForm({ ...form, cta_texto: e.target.value })}
            />
          </Field>
          <Field label="CTA link (HTTPS)">
            <input
              className={inputClass}
              value={form.cta_link}
              onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
            />
          </Field>
          <Field label="Imagem URL (HTTPS)">
            <input
              className={inputClass}
              value={form.imagem_url}
              onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
            />
          </Field>
          <Field label="Ícone (lucide)">
            <input
              className={inputClass}
              value={form.icone}
              onChange={(e) => setForm({ ...form, icone: e.target.value })}
            />
          </Field>
          <Field label="id_edital (filtro CTA)">
            <input
              className={inputClass}
              value={form.id_edital}
              onChange={(e) => setForm({ ...form, id_edital: e.target.value })}
              disabled={
                editId != null &&
                items.find((i) => i.id === editId)?.tipo === "auto_edital"
              }
            />
          </Field>
          <Field label="Início (agendamento)">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.inicio_em}
              onChange={(e) => setForm({ ...form, inicio_em: e.target.value })}
            />
          </Field>
          <Field label="Fim (agendamento)">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.fim_em}
              onChange={(e) => setForm({ ...form, fim_em: e.target.value })}
            />
          </Field>
        </div>
        <Toggle
          label="Ativo"
          checked={form.ativo}
          onChange={(v) => setForm({ ...form, ativo: v })}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {editId != null ? "Salvar" : "Criar manual"}
          </button>
          {editId != null ? (
            <button
              type="button"
              disabled={busy}
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Ordenação global
        </h3>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {item.ordem}. {item.titulo}
                </p>
                <p className="text-xs text-slate-500">
                  {item.tipo}
                  {item.edital_numero_ano
                    ? ` · ${item.edital_numero_ano}`
                    : ""}
                  {item.id_edital != null ? ` · edital #${item.id_edital}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.ativo ? (
                    <StatusBadge label="Ativo" tone="green" />
                  ) : (
                    <StatusBadge label="Inativo" tone="gray" />
                  )}
                  {item.tipo === "auto_edital" ? (
                    item.auto_edital_habilitado ? (
                      <StatusBadge label="Auto on" tone="green" />
                    ) : (
                      <StatusBadge label="Auto off" tone="yellow" />
                    )
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => void move(item.id, -1)}
                  className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === items.length - 1}
                  onClick={() => void move(item.id, 1)}
                  className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(item)}
                  className="rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  Editar
                </button>
                {item.tipo === "manual" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDelete(item.id, false)}
                      className="rounded border border-amber-200 px-2 py-1 text-xs text-amber-800"
                    >
                      Soft
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDelete(item.id, true)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                    >
                      Hard
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum item ainda.</p>
          ) : null}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Automáticos ({automaticos.length})
        </h3>
        <ul className="space-y-2">
          {automaticos.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{item.titulo}</p>
                <p className="text-xs text-slate-500">
                  Edital #{item.id_edital}
                  {item.edital_numero_ano ? ` · ${item.edital_numero_ano}` : ""}
                  {item.edital_aberto ? " · aberto" : " · fechado"}
                </p>
              </div>
              <Toggle
                label="auto_edital_habilitado"
                checked={item.auto_edital_habilitado}
                onChange={(v) => void onToggleAuto(item.id, v)}
              />
            </li>
          ))}
          {automaticos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum auto ainda — publique um edital com inscrições abertas ou
              use Sincronizar.
            </p>
          ) : null}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Manuais ({manuais.length})
        </h3>
        <p className="text-xs text-slate-500">
          Use o formulário acima e a lista de ordenação para criar/editar/apagar.
        </p>
      </div>
    </section>
  );
}
