"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { useToast } from "../../../components/ToastProvider";
import { ApiError, apiFetch } from "../../../lib/api";
import {
  gerarChamada,
  getChamada,
  importarMatriculados,
  listChamadas,
} from "../../../lib/w20-w25-api";

type OfertaOption = {
  id: number;
  turno?: string;
  edital?: { numero_ano?: string };
  curso?: { nome?: string };
  campus?: { nome?: string };
};

type ChamadaListItem = {
  id: number;
  numero: number;
  criado_em?: string;
};

export default function ChamadasPage() {
  const { push } = useToast();
  const [ofertas, setOfertas] = useState<OfertaOption[]>([]);
  const [idOferta, setIdOferta] = useState<number | "">("");
  const [chamadas, setChamadas] = useState<ChamadaListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getChamada>
  > | null>(null);
  const [cpfsText, setCpfsText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<OfertaOption[]>("/ofertas");
        if (!cancelled) setOfertas(list);
      } catch {
        if (!cancelled) setOfertas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshList(ofertaId: number) {
    const list = (await listChamadas(ofertaId)) as ChamadaListItem[];
    setChamadas(list);
  }

  async function onSelectOferta(value: string) {
    const id = value ? Number(value) : "";
    setIdOferta(id);
    setSelectedId(null);
    setDetail(null);
    if (typeof id === "number") {
      try {
        await refreshList(id);
      } catch (e) {
        setChamadas([]);
        push(
          e instanceof ApiError ? e.message : "Falha ao listar chamadas.",
          "error",
        );
      }
    } else {
      setChamadas([]);
    }
  }

  async function onGerar() {
    if (typeof idOferta !== "number") return;
    setBusy(true);
    try {
      const created = (await gerarChamada({ id_oferta: idOferta })) as {
        id: number;
      };
      await refreshList(idOferta);
      setSelectedId(created.id);
      setDetail(await getChamada(created.id));
      push(`Chamada #${created.id} gerada.`);
    } catch (e) {
      push(
        e instanceof ApiError ? e.message : "Falha ao gerar chamada.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onOpen(id: number) {
    setBusy(true);
    try {
      setSelectedId(id);
      setDetail(await getChamada(id));
    } catch (e) {
      push(
        e instanceof ApiError ? e.message : "Falha ao carregar chamada.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onMatricular() {
    if (!selectedId) return;
    const cpfs = cpfsText
      .split(/[\s;,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!cpfs.length) {
      push("Informe ao menos um CPF.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = (await importarMatriculados(selectedId, cpfs)) as {
        updated?: number;
        notified?: number;
      };
      push(
        `Matriculados: ${res.updated ?? 0} atualizado(s). Notificação stub: ${res.notified ?? 0}.`,
      );
      setDetail(await getChamada(selectedId));
    } catch (e) {
      push(
        e instanceof ApiError ? e.message : "Falha no import de matriculados.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const regular = useMemo(
    () => detail?.itens?.filter((i) => i.lista === "chamada_regular") ?? [],
    [detail],
  );
  const espera = useMemo(
    () => detail?.itens?.filter((i) => i.lista === "espera") ?? [],
    [detail],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Chamadas</h1>
        <p className="text-sm text-slate-500">
          Listas regulares e de espera por oferta — REQ-3.4
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Oferta</span>
          <select
            value={idOferta === "" ? "" : String(idOferta)}
            onChange={(e) => onSelectOferta(e.target.value)}
            className="min-w-[280px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.id} {o.edital?.numero_ano ?? ""} — {o.curso?.nome ?? "curso"}{" "}
                / {o.campus?.nome ?? "campus"} / {o.turno ?? ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || typeof idOferta !== "number"}
          onClick={onGerar}
          className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Gerar chamada
        </button>
      </div>

      {chamadas.length ? (
        <DataTable headers={["ID", "Número", "Criada em", ""]}>
          {chamadas.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-2">{c.id}</td>
              <td className="px-4 py-2">{c.numero}</td>
              <td className="px-4 py-2 text-slate-600">
                {c.criado_em
                  ? new Date(c.criado_em).toLocaleString("pt-BR")
                  : "—"}
              </td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => onOpen(c.id)}
                >
                  Abrir
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}

      {detail ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Chamada #{detail.id} (nº {detail.numero})
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                Lista regular ({regular.length})
              </h3>
              <DataTable headers={["Pos", "Cota", "Candidato", "Realocado AC"]}>
                {regular.map((i) => (
                  <tr key={`${i.posicao}-${i.candidatura?.id}`}>
                    <td className="px-3 py-2">{i.posicao}</td>
                    <td className="px-3 py-2">{i.tipo_cota}</td>
                    <td className="px-3 py-2">
                      {i.candidatura?.usuario?.nome_completo ??
                        i.candidatura?.id}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {i.realocado_para_ac ? "sim" : "—"}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                Lista de espera ({espera.length})
              </h3>
              <DataTable headers={["Pos", "Cota", "Candidato"]}>
                {espera.map((i) => (
                  <tr key={`e-${i.posicao}-${i.candidatura?.id}`}>
                    <td className="px-3 py-2">{i.posicao}</td>
                    <td className="px-3 py-2">{i.tipo_cota}</td>
                    <td className="px-3 py-2">
                      {i.candidatura?.usuario?.nome_completo ??
                        i.candidatura?.id}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium text-slate-700">
              Importar matriculados (CPFs)
            </h3>
            <textarea
              value={cpfsText}
              onChange={(e) => setCpfsText(e.target.value)}
              rows={4}
              placeholder="Um CPF por linha ou separados por vírgula"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              disabled={busy || !selectedId}
              onClick={onMatricular}
              className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Importar matriculados
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
