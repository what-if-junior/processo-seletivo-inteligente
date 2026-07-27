"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Edital } from "@repo/types";
import { ApiError } from "../../../lib/api";
import { listEditaisGestao } from "../../../lib/processos-api";
import { DataTable } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";

function metodoLabel(edital: Edital): string {
  const base = edital.metodo_selecao;
  if (edital.merito_tipo) return `${base} · ${edital.merito_tipo}`;
  return base;
}

export default function ProcessosPage() {
  const [data, setData] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await listEditaisGestao();
        if (cancelled) return;
        setData(list);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData([]);
        setError(
          e instanceof ApiError
            ? e.message
            : "Não foi possível carregar os processos.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (e) =>
        e.numero_ano.toLowerCase().includes(term) ||
        e.metodo_selecao.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Processos seletivos
          </h1>
          <p className="text-sm text-slate-500">
            Criar e editar editais, PDFs, termos, ofertas e publicação
          </p>
        </div>
        <Link
          href="/admin/processos/novo"
          className="inline-flex items-center justify-center rounded-lg bg-[#2f9e41] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#278a37]"
        >
          Novo processo
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <input
        type="search"
        placeholder="Buscar por número/ano ou método…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f9e41] sm:max-w-md"
      />

      {loading ? (
        <p className="text-sm text-slate-500">Carregando processos…</p>
      ) : (
        <DataTable
          headers={[
            "Número/ano",
            "Método",
            "Formato",
            "Publicado",
            "Inscrições",
            "Ações",
          ]}
          empty={
            filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Nenhum processo encontrado. Crie o primeiro edital.
              </div>
            ) : null
          }
        >
          {filtered.map((edital) => (
            <tr key={edital.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {edital.numero_ano}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {metodoLabel(edital)}
              </td>
              <td className="px-4 py-3">
                {edital.is_simplificado ? (
                  <StatusBadge label="Simplificado" tone="blue" />
                ) : (
                  <StatusBadge label="Completo" tone="gray" />
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={edital.publicado ? "Sim" : "Rascunho"}
                  tone={edital.publicado ? "green" : "yellow"}
                />
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={edital.inscricoes_abertas ? "Abertas" : "Fechadas"}
                  tone={edital.inscricoes_abertas ? "green" : "gray"}
                />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/processos/${edital.id}`}
                  className="text-sm font-medium text-[#2f9e41] hover:underline"
                >
                  Abrir
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
