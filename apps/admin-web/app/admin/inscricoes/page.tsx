"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatDate } from "../../../lib/format";
import { useInscricoes } from "../../../lib/hooks";
import {
  listCampusCatalog,
  listEditaisGestao,
} from "../../../lib/processos-api";
import {
  STATUS_FILTER_OPTIONS,
  statusLabel,
  statusTone,
} from "../../../lib/status";

export default function InscricoesPage() {
  const { data, source, loading, error } = useInscricoes();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [idEdital, setIdEdital] = useState("");
  const [idCampus, setIdCampus] = useState("");
  const [editais, setEditais] = useState<{ value: string; label: string }[]>([]);
  const [campi, setCampi] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    void Promise.all([
      listEditaisGestao().catch(() => []),
      listCampusCatalog().catch(() => []),
    ]).then(([eds, camps]) => {
      setEditais(
        eds.map((e) => ({
          value: String(e.id),
          label: e.numero_ano || `Edital #${e.id}`,
        })),
      );
      setCampi(
        camps.map((c) => ({
          value: String(c.id),
          label: c.nome ?? `Campus ${c.id}`,
        })),
      );
    });
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((item) => {
      if (status && item.status !== status) return false;
      if (idEdital && String(item.id_edital) !== idEdital) return false;
      if (
        idCampus &&
        String(item.oferta?.id_campus ?? item.oferta?.campus?.id ?? "") !==
          idCampus
      ) {
        return false;
      }
      if (!term) return true;
      const nome = item.usuario?.nome_completo?.toLowerCase() ?? "";
      const processo = item.oferta?.curso?.nome?.toLowerCase() ?? "";
      const proto = item.protocolo?.toLowerCase() ?? "";
      return (
        nome.includes(term) || processo.includes(term) || proto.includes(term)
      );
    });
  }, [data, q, status, idEdital, idCampus]);

  const statusChart = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filtered) {
      map.set(item.status, (map.get(item.status) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([st, total]) => ({ st, total, label: statusLabel(st) }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);
  const maxStatus = Math.max(...statusChart.map((s) => s.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Gerenciar Inscrições
        </h1>
        <p className="text-sm text-slate-500">
          Análise e revisão de candidaturas
          {source === "mock" ? " (dados de demonstração)" : ""}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Buscar nome, curso ou protocolo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f9e41] sm:col-span-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={idEdital}
          onChange={(e) => setIdEdital(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos os editais</option>
          {editais.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <select
          value={idCampus}
          onChange={(e) => setIdCampus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm lg:col-span-2"
        >
          <option value="">Todos os campi</option>
          {campi.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Distribuição por status ({filtered.length})
        </h2>
        <div className="flex h-36 items-end gap-2">
          {statusChart.length === 0 ? (
            <p className="text-sm text-slate-500">Sem dados.</p>
          ) : (
            statusChart.map((s) => (
              <div key={s.st} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold">{s.total}</span>
                <div
                  className="w-full rounded-t-md bg-sky-500/70"
                  style={{
                    height: `${(s.total / maxStatus) * 100}%`,
                    minHeight: 4,
                  }}
                  title={s.label}
                />
                <span className="max-w-full truncate text-[10px] text-slate-500">
                  {s.label}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando inscrições…</p>
      ) : (
        <DataTable
          headers={[
            "Candidato",
            "Processo",
            "Campus",
            "Status",
            "Data de Envio",
            "Contato",
            "Ações",
          ]}
          empty={
            filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Nenhuma inscrição encontrada com os filtros atuais.
              </div>
            ) : null
          }
        >
          {filtered.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {item.usuario?.nome_completo ?? `Usuário #${item.id_usuario}`}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {item.oferta?.curso?.nome ?? `Oferta #${item.id_oferta}`}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {item.oferta?.campus?.nome ?? "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={statusLabel(item.status)}
                  tone={statusTone(item.status)}
                />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(item.data_inscricao)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {item.usuario?.email ?? item.usuario?.telefone ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/inscricoes/${item.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[#2563eb] hover:bg-blue-50"
                >
                  Ver Detalhes
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
