"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatDate } from "../../../lib/format";
import { useInscricoes } from "../../../lib/hooks";
import {
  STATUS_FILTER_OPTIONS,
  statusLabel,
  statusTone,
} from "../../../lib/status";

export default function InscricoesPage() {
  const { data, source, loading, error } = useInscricoes();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((item) => {
      if (status && item.status !== status) return false;
      if (!term) return true;
      const nome = item.usuario?.nome_completo?.toLowerCase() ?? "";
      const processo = item.oferta?.curso?.nome?.toLowerCase() ?? "";
      const protocolo = (item.protocolo ?? "").toLowerCase();
      return (
        nome.includes(term) ||
        processo.includes(term) ||
        protocolo.includes(term)
      );
    });
  }, [data, q, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Gerenciar Inscrições
        </h1>
        <p className="text-sm text-slate-500">
          Revise candidaturas e acompanhe o status documental
          {source === "mock" ? " (dados de demonstração)" : ""}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nome, processo ou protocolo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f9e41]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f9e41]"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando inscrições…</p>
      ) : (
        <DataTable
          headers={[
            "Protocolo",
            "Candidato",
            "Processo",
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
              <td className="px-4 py-3 font-mono text-xs text-slate-700">
                {item.protocolo ?? "—"}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">
                {item.usuario?.nome_completo ?? `Usuário #${item.id_usuario}`}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {item.oferta?.curso?.nome ?? `Oferta #${item.id_oferta}`}
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
