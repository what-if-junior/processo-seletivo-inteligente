"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TIPO_COTA_VALUES,
  TurnoOferta,
  type CampusRef,
  type Cursos,
} from "@repo/types";
import { ApiError } from "../lib/api";
import {
  createOferta,
  deleteOferta,
  listCampusCatalog,
  listCursosCatalog,
  listOfertasGestao,
  replaceOfertaCotas,
  updateOferta,
  type CotaPayload,
  type OfertaGestao,
} from "../lib/processos-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";

type CotaRow = { tipo_cota: string; vagas: string; percentual: string };

function cotasToRows(oferta: OfertaGestao): CotaRow[] {
  const existing = oferta.distribuicao_cotas ?? [];
  if (!existing.length) {
    return TIPO_COTA_VALUES.map((t) => ({
      tipo_cota: t,
      vagas: t === "AC" ? String(oferta.vagas_totais) : "",
      percentual: "",
    }));
  }
  return existing.map((c) => ({
    tipo_cota: String(c.tipo_cota),
    vagas: c.vagas != null ? String(c.vagas) : "",
    percentual: c.percentual != null ? String(c.percentual) : "",
  }));
}

function rowsToPayload(rows: CotaRow[]): CotaPayload[] {
  return rows
    .filter((r) => r.vagas.trim() || r.percentual.trim())
    .map((r) => ({
      tipo_cota: r.tipo_cota,
      vagas: r.vagas.trim() ? Number(r.vagas) : null,
      percentual: r.percentual.trim() ? Number(r.percentual) : null,
    }));
}

export function OfertasEditor({ editalId }: { editalId: number }) {
  const { push } = useToast();
  const [ofertas, setOfertas] = useState<OfertaGestao[]>([]);
  const [cursos, setCursos] = useState<Cursos[]>([]);
  const [campi, setCampi] = useState<CampusRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [idCurso, setIdCurso] = useState("");
  const [idCampus, setIdCampus] = useState("");
  const [turno, setTurno] = useState<TurnoOferta>(TurnoOferta.NOTURNO);
  const [vagas, setVagas] = useState("40");

  const [editId, setEditId] = useState<number | null>(null);
  const [cotaRows, setCotaRows] = useState<CotaRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [ofs, cs, cps] = await Promise.all([
        listOfertasGestao(editalId),
        listCursosCatalog(),
        listCampusCatalog(),
      ]);
      setOfertas(ofs);
      setCursos(cs);
      setCampi(cps);
      if (!idCurso && cs[0]) setIdCurso(String(cs[0].id));
      if (!idCampus && cps[0]) setIdCampus(String(cps[0].id));
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Falha ao carregar ofertas.",
      );
    } finally {
      setLoading(false);
    }
  }, [editalId, idCurso, idCampus]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per edital
  }, [editalId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createOferta({
        id_edital: editalId,
        id_curso: Number(idCurso),
        id_campus: Number(idCampus),
        turno,
        vagas_totais: Number(vagas),
      });
      push("Oferta criada.");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao criar oferta.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function openCotas(oferta: OfertaGestao) {
    setEditId(oferta.id);
    setCotaRows(cotasToRows(oferta));
    setWarnings((oferta.warnings ?? []).map((w) => w.message));
  }

  async function saveCotas() {
    if (editId == null) return;
    setBusy(true);
    try {
      const updated = await replaceOfertaCotas(editId, rowsToPayload(cotaRows));
      setWarnings((updated.warnings ?? []).map((w) => w.message));
      push("Cotas atualizadas.");
      await reload();
      setEditId(updated.id);
      setCotaRows(cotasToRows(updated));
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar cotas.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Remover esta oferta?")) return;
    setBusy(true);
    try {
      await deleteOferta(id);
      if (editId === id) setEditId(null);
      push("Oferta removida.");
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao remover.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patchVagas(id: number, next: number) {
    setBusy(true);
    try {
      await updateOferta(id, { vagas_totais: next });
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao atualizar vagas.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando ofertas…</p>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Ofertas</h2>
        <p className="text-sm text-slate-500">
          Curso × campus × turno × vagas e distribuição de cotas
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Field label="Curso">
          <select
            className={inputClass}
            value={idCurso}
            onChange={(e) => setIdCurso(e.target.value)}
            required
          >
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Campus">
          <select
            className={inputClass}
            value={idCampus}
            onChange={(e) => setIdCampus(e.target.value)}
            required
          >
            {campi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Turno">
          <select
            className={inputClass}
            value={turno}
            onChange={(e) => setTurno(e.target.value as TurnoOferta)}
          >
            {Object.values(TurnoOferta).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vagas totais">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={vagas}
            onChange={(e) => setVagas(e.target.value)}
            required
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
      </form>

      <ul className="space-y-3">
        {ofertas.map((o) => (
          <li
            key={o.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">
                  {o.curso?.nome ?? `Curso #${o.id_curso}`} ·{" "}
                  {o.campus?.nome ?? `Campus #${o.id_campus}`}
                </p>
                <p className="text-sm text-slate-500">
                  {o.turno} · {o.vagas_totais} vagas ·{" "}
                  {(o.distribuicao_cotas ?? []).length} cotas
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => openCotas(o)}
                >
                  Cotas
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    const n = window.prompt(
                      "Vagas totais",
                      String(o.vagas_totais),
                    );
                    if (n) void patchVagas(o.id, Number(n));
                  }}
                >
                  Editar vagas
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                  onClick={() => void onDelete(o.id)}
                >
                  Remover
                </button>
              </div>
            </div>
            {(o.warnings ?? []).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {o.warnings!.map((w) => (
                  <StatusBadge key={w.code} label={w.code} tone="yellow" />
                ))}
              </div>
            ) : null}
          </li>
        ))}
        {ofertas.length === 0 ? (
          <li className="text-sm text-slate-500">Nenhuma oferta ainda.</li>
        ) : null}
      </ul>

      {editId != null ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Cotas da oferta #{editId}
          </h3>
          {warnings.map((w) => (
            <p
              key={w}
              className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
            >
              {w}
            </p>
          ))}
          <div className="space-y-2">
            {cotaRows.map((row, idx) => (
              <div
                key={row.tipo_cota}
                className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              >
                <span className="col-span-1 flex items-center text-sm font-medium text-slate-700">
                  {row.tipo_cota}
                </span>
                <input
                  className={inputClass}
                  placeholder="Vagas"
                  value={row.vagas}
                  onChange={(e) => {
                    const next = [...cotaRows];
                    next[idx] = { ...row, vagas: e.target.value };
                    setCotaRows(next);
                  }}
                />
                <input
                  className={inputClass}
                  placeholder="% "
                  value={row.percentual}
                  onChange={(e) => {
                    const next = [...cotaRows];
                    next[idx] = { ...row, percentual: e.target.value };
                    setCotaRows(next);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveCotas()}
              className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm text-white hover:bg-[#278a37] disabled:opacity-60"
            >
              Salvar cotas
            </button>
            <button
              type="button"
              onClick={() => setEditId(null)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
