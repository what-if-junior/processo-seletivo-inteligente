"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ModoEntrega,
  SubtipoEntregaOnline,
  type CampusRef,
  type Cursos,
} from "@repo/types";
import { ApiError } from "../lib/api";
import {
  createEntregaDocumental,
  deleteEntregaDocumental,
  listEntregaDocumentalGestao,
  updateEntregaDocumental,
  type EntregaDocumental,
} from "../lib/entrega-documental-api";
import {
  listCronogramaGestao,
  type CronogramaEtapa,
} from "../lib/cronograma-api";
import {
  listCampusCatalog,
  listCursosCatalog,
} from "../lib/processos-api";
import { useToast } from "./ToastProvider";
import { Field, inputClass } from "./ProcessoFormFields";
import { StatusBadge } from "./StatusBadge";

export function EntregaDocumentalEditor({ editalId }: { editalId: number }) {
  const { push } = useToast();
  const [configs, setConfigs] = useState<EntregaDocumental[]>([]);
  const [campi, setCampi] = useState<CampusRef[]>([]);
  const [cursos, setCursos] = useState<Cursos[]>([]);
  const [etapas, setEtapas] = useState<CronogramaEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [idCampus, setIdCampus] = useState("");
  const [idCurso, setIdCurso] = useState("");
  const [idEtapa, setIdEtapa] = useState("");
  const [modo, setModo] = useState<ModoEntrega>(ModoEntrega.PRESENCIAL);
  const [localNome, setLocalNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [horario, setHorario] = useState("");
  const [contactos, setContactos] = useState("");
  const [subtipo, setSubtipo] = useState<SubtipoEntregaOnline>(
    SubtipoEntregaOnline.UPLOAD_NATIVO_PWA,
  );
  const [urlExterna, setUrlExterna] = useState("");
  const [emailInst, setEmailInst] = useState("");
  const [instrucoes, setInstrucoes] = useState("");

  const campusById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of campi) m.set(c.id, c.nome);
    return m;
  }, [campi]);

  const cursoById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cursos) m.set(c.id, c.nome);
    return m;
  }, [cursos]);

  const etapaById = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of etapas) m.set(e.id, e.nome_exibido);
    return m;
  }, [etapas]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [entrega, cron, cs, cps] = await Promise.all([
        listEntregaDocumentalGestao(editalId),
        listCronogramaGestao(editalId),
        listCursosCatalog(),
        listCampusCatalog(),
      ]);
      setConfigs(entrega.configuracoes);
      setEtapas(cron.etapas);
      setCursos(cs);
      setCampi(cps);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Falha ao carregar entrega documental.",
      );
    } finally {
      setLoading(false);
    }
  }, [editalId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetForm() {
    setEditId(null);
    setIdCampus("");
    setIdCurso("");
    setIdEtapa("");
    setModo(ModoEntrega.PRESENCIAL);
    setLocalNome("");
    setEndereco("");
    setHorario("");
    setContactos("");
    setSubtipo(SubtipoEntregaOnline.UPLOAD_NATIVO_PWA);
    setUrlExterna("");
    setEmailInst("");
    setInstrucoes("");
  }

  function loadConfig(cfg: EntregaDocumental) {
    setEditId(cfg.id);
    setIdCampus(String(cfg.id_campus));
    setIdCurso(String(cfg.id_curso));
    setIdEtapa(String(cfg.id_cronograma_etapa));
    setModo(cfg.modo);
    setLocalNome(cfg.local_nome ?? "");
    setEndereco(cfg.endereco ?? "");
    setHorario(cfg.horario ?? "");
    setContactos(cfg.contactos ?? "");
    setSubtipo(
      cfg.subtipo_online ?? SubtipoEntregaOnline.UPLOAD_NATIVO_PWA,
    );
    setUrlExterna(cfg.url_externa ?? "");
    setEmailInst(cfg.email_institucional ?? "");
    setInstrucoes(cfg.instrucoes ?? "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idCampus || !idCurso || !idEtapa) {
      push("Selecione campus, curso e etapa.", "error");
      return;
    }
    if (modo === ModoEntrega.PRESENCIAL) {
      if (!localNome.trim() || !endereco.trim()) {
        push("Presencial exige local e endereço.", "error");
        return;
      }
    } else if (subtipo === SubtipoEntregaOnline.URL_FORMULARIO_EXTERNO) {
      if (!urlExterna.trim()) {
        push("URL externa obrigatória para este subtipo.", "error");
        return;
      }
    } else if (subtipo === SubtipoEntregaOnline.EMAIL_INSTITUCIONAL) {
      if (!emailInst.trim()) {
        push("E-mail institucional obrigatório para este subtipo.", "error");
        return;
      }
    }

    setBusy(true);
    const payload =
      modo === ModoEntrega.PRESENCIAL
        ? {
            id_campus: Number(idCampus),
            id_curso: Number(idCurso),
            id_cronograma_etapa: Number(idEtapa),
            modo,
            local_nome: localNome.trim(),
            endereco: endereco.trim(),
            horario: horario.trim() || null,
            contactos: contactos.trim() || null,
            instrucoes: instrucoes.trim() || null,
            subtipo_online: null,
            url_externa: null,
            email_institucional: null,
          }
        : {
            id_campus: Number(idCampus),
            id_curso: Number(idCurso),
            id_cronograma_etapa: Number(idEtapa),
            modo,
            subtipo_online: subtipo,
            url_externa:
              subtipo === SubtipoEntregaOnline.URL_FORMULARIO_EXTERNO
                ? urlExterna.trim()
                : null,
            email_institucional:
              subtipo === SubtipoEntregaOnline.EMAIL_INSTITUCIONAL
                ? emailInst.trim()
                : null,
            instrucoes: instrucoes.trim() || null,
            local_nome: null,
            endereco: null,
            horario: null,
            contactos: null,
          };

    try {
      if (editId != null) {
        await updateEntregaDocumental(editalId, editId, payload);
        push("Configuração de entrega atualizada.");
      } else {
        await createEntregaDocumental(editalId, payload);
        push("Configuração de entrega criada.");
      }
      resetForm();
      await reload();
    } catch (err) {
      push(
        err instanceof ApiError ? err.message : "Erro ao salvar entrega.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Remover esta configuração de entrega?")) return;
    setBusy(true);
    try {
      await deleteEntregaDocumental(editalId, id);
      if (editId === id) resetForm();
      push("Configuração removida.");
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

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Carregando entrega documental…
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Entrega documental
        </h2>
        <p className="text-sm text-slate-500">
          Modalidade por vínculo edital ↔ campus/curso ↔ etapa. Presencial
          oculta uploads obrigatórios daquela etapa (
          <code className="text-xs">uploads_ocultos</code>).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {etapas.length === 0 ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Cadastre etapas no cronograma antes de configurar entrega.
        </p>
      ) : null}

      <ul className="space-y-2">
        {configs.map((cfg) => (
          <li
            key={cfg.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {campusById.get(cfg.id_campus) ?? `Campus #${cfg.id_campus}`} ·{" "}
                {cursoById.get(cfg.id_curso) ?? `Curso #${cfg.id_curso}`}
              </p>
              <p className="text-xs text-slate-500">
                Etapa:{" "}
                {etapaById.get(cfg.id_cronograma_etapa) ??
                  `#${cfg.id_cronograma_etapa}`}{" "}
                · {cfg.modo}
                {cfg.modo === ModoEntrega.ONLINE && cfg.subtipo_online
                  ? ` / ${cfg.subtipo_online}`
                  : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {cfg.uploads_ocultos ? (
                  <StatusBadge label="Uploads ocultos" tone="yellow" />
                ) : (
                  <StatusBadge label="Uploads visíveis" tone="green" />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs"
                onClick={() => loadConfig(cfg)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() => void onDelete(cfg.id)}
              >
                Remover
              </button>
            </div>
          </li>
        ))}
        {configs.length === 0 ? (
          <li className="text-sm text-slate-500">
            Nenhuma configuração de entrega.
          </li>
        ) : null}
      </ul>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          {editId != null
            ? `Editar entrega #${editId}`
            : "Nova configuração"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Campus">
            <select
              className={inputClass}
              value={idCampus}
              onChange={(e) => setIdCampus(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {campi.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Curso">
            <select
              className={inputClass}
              value={idCurso}
              onChange={(e) => setIdCurso(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Etapa do cronograma">
            <select
              className={inputClass}
              value={idEtapa}
              onChange={(e) => setIdEtapa(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.ordem}. {e.nome_exibido} ({e.tipo})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modo">
            <select
              className={inputClass}
              value={modo}
              onChange={(e) => setModo(e.target.value as ModoEntrega)}
            >
              {Object.values(ModoEntrega).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {modo === ModoEntrega.PRESENCIAL ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Local">
              <input
                className={inputClass}
                value={localNome}
                onChange={(e) => setLocalNome(e.target.value)}
                required
              />
            </Field>
            <Field label="Endereço">
              <input
                className={inputClass}
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                required
              />
            </Field>
            <Field label="Horário">
              <input
                className={inputClass}
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </Field>
            <Field label="Contactos">
              <input
                className={inputClass}
                value={contactos}
                onChange={(e) => setContactos(e.target.value)}
              />
            </Field>
            <p className="sm:col-span-2 text-xs text-amber-800">
              Modo presencial: uploads obrigatórios desta etapa ficam ocultos
              na PWA (<code>uploads_ocultos=true</code>).
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subtipo online">
              <select
                className={inputClass}
                value={subtipo}
                onChange={(e) =>
                  setSubtipo(e.target.value as SubtipoEntregaOnline)
                }
              >
                {Object.values(SubtipoEntregaOnline).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            {subtipo === SubtipoEntregaOnline.URL_FORMULARIO_EXTERNO ? (
              <Field label="URL / formulário externo">
                <input
                  type="url"
                  className={inputClass}
                  value={urlExterna}
                  onChange={(e) => setUrlExterna(e.target.value)}
                  required
                />
              </Field>
            ) : null}
            {subtipo === SubtipoEntregaOnline.EMAIL_INSTITUCIONAL ? (
              <Field label="E-mail institucional">
                <input
                  type="email"
                  className={inputClass}
                  value={emailInst}
                  onChange={(e) => setEmailInst(e.target.value)}
                  required
                />
              </Field>
            ) : null}
          </div>
        )}

        <Field label="Instruções">
          <textarea
            className={`${inputClass} min-h-16`}
            value={instrucoes}
            onChange={(e) => setInstrucoes(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || etapas.length === 0}
            className="rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-medium text-white hover:bg-[#278a37] disabled:opacity-60"
          >
            {editId != null ? "Salvar entrega" : "Adicionar entrega"}
          </button>
          {editId != null ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
