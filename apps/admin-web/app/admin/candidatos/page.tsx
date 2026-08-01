"use client";

import { useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { KpiCard } from "../../../components/KpiCard";
import { StatusBadge } from "../../../components/StatusBadge";
import { useToast } from "../../../components/ToastProvider";
import { downloadTextFile, formatDate, formatNumber, toCsv } from "../../../lib/format";
import { useCandidatos } from "../../../lib/hooks";
import { updateUsuarioAtivo } from "../../../lib/w20-w25-api";

export default function CandidatosPage() {
  const { data, source, loading, error, reload } = useCandidatos();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">(
    "todos",
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((c) => {
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (!term) return true;
      return (
        c.nome.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      );
    });
  }, [data, q, statusFilter]);

  const ativos = data.filter((c) => c.status === "ativo").length;
  const inativos = data.filter((c) => c.status === "inativo").length;
  const maxBar = Math.max(ativos, inativos, 1);

  async function toggleAtivo(c: (typeof data)[number]) {
    setBusyId(c.id);
    try {
      await updateUsuarioAtivo(c.id, c.status !== "ativo");
      push(
        c.status === "ativo"
          ? "Acesso desativado (inscrições mantidas)."
          : "Acesso reativado.",
      );
      reload();
    } catch (e) {
      push(
        e instanceof Error ? e.message : "Falha ao atualizar ativo/inativo.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    const csv = toCsv(
      ["Nome", "Email", "Status", "Data de Cadastro"],
      filtered.map((c) => [
        c.nome,
        c.email,
        c.status === "ativo" ? "Ativo" : "Inativo",
        c.data_cadastro,
      ]),
    );
    downloadTextFile(
      `candidatos-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
    push("Exportação CSV gerada no navegador.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Candidatos</h1>
          <p className="text-sm text-slate-500">
            Contas e acessos — análise de ativos/inativos
            {source === "mock" ? " (dados de demonstração)" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Exportar CSV
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Total" value={formatNumber(data.length)} />
        <KpiCard title="Ativos" value={formatNumber(ativos)} />
        <KpiCard title="Inativos" value={formatNumber(inativos)} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Ativo vs inativo
        </h2>
        <div className="flex h-36 items-end gap-10 px-10">
          {[
            { label: "Ativo", value: ativos, cls: "bg-[#2f9e41]/70" },
            { label: "Inativo", value: inativos, cls: "bg-slate-400/70" },
          ].map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold">{b.value}</span>
              <div
                className={`w-full max-w-[100px] rounded-t-md ${b.cls}`}
                style={{
                  height: `${(b.value / maxBar) * 100}%`,
                  minHeight: b.value ? 4 : 0,
                }}
              />
              <span className="text-xs text-slate-500">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f9e41]"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando candidatos…</p>
      ) : (
        <DataTable
          headers={["Nome", "Email", "Status", "Data de Cadastro", "Ações"]}
          empty={
            filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Nenhum candidato encontrado.
              </div>
            ) : null
          }
        >
          {filtered.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{c.nome}</td>
              <td className="px-4 py-3 text-slate-600">{c.email}</td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={c.status === "ativo" ? "Ativo" : "Inativo"}
                  tone={c.status === "ativo" ? "green" : "gray"}
                />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(c.data_cadastro)}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  disabled={busyId === c.id || source === "mock"}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                  onClick={() => toggleAtivo(c)}
                >
                  {c.status === "ativo" ? "Desativar" : "Ativar"}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
