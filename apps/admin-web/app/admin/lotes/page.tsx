"use client";

import { useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { Tabs } from "../../../components/Tabs";
import { useToast } from "../../../components/ToastProvider";
import { ApiError } from "../../../lib/api";
import {
  commitContas,
  commitInscricoes,
  dryRunContas,
  dryRunInscricoes,
  type DryRunResult,
  type LoteColumnMap,
} from "../../../lib/w20-w25-api";

const CONTAS_FIELDS = [
  "nome_completo",
  "email",
  "cpf",
  "data_nascimento",
  "telefone",
  "senha",
] as const;

const INSC_FIELDS = [
  "cpf",
  "id_oferta",
  "tipo_vaga",
  "tipo_ingresso",
  "data_inscricao",
] as const;

type Flow = "contas" | "inscricoes";

export default function LotesPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Flow>("contas");
  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState("utf-8");
  const [columnMap, setColumnMap] = useState<LoteColumnMap>({});
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [busy, setBusy] = useState(false);

  const fields = tab === "contas" ? CONTAS_FIELDS : INSC_FIELDS;

  const summaryText = useMemo(() => {
    if (!dry) return "";
    return `total: ${dry.total} · válidos: ${dry.validos} · avisos: ${dry.avisos} · erros: ${dry.erros}`;
  }, [dry]);

  function resetFlow() {
    setDry(null);
  }

  async function runDry() {
    if (!file) {
      push("Selecione um arquivo CSV/XLSX.", "error");
      return;
    }
    setBusy(true);
    try {
      const result =
        tab === "contas"
          ? await dryRunContas(file, encoding, columnMap)
          : await dryRunInscricoes(file, encoding, columnMap);
      setDry(result);
      push("Dry-run concluído.");
    } catch (e) {
      push(
        e instanceof ApiError ? e.message : "Falha no dry-run do lote.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!file) return;
    setBusy(true);
    try {
      const result =
        tab === "contas"
          ? await commitContas(file, encoding, columnMap)
          : await commitInscricoes(file, encoding, columnMap);
      setDry(result.dryRun);
      push(`Commit: ${result.criados} criado(s), ${result.ignorados} ignorado(s).`);
    } catch (e) {
      push(
        e instanceof ApiError ? e.message : "Falha ao gravar o lote.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Lotes</h1>
        <p className="text-sm text-slate-500">
          Importação em lote de contas e inscrições (CSV/XLSX) — REQ-2.8
        </p>
      </div>

      <Tabs
        tabs={[
          { id: "contas", label: "Contas" },
          { id: "inscricoes", label: "Inscrições" },
        ]}
        active={tab}
        onChange={(id) => {
          setTab(id as Flow);
          resetFlow();
        }}
      />

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Arquivo</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              resetFlow();
            }}
            className="block w-full text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Encoding</span>
          <select
            value={encoding}
            onChange={(e) => setEncoding(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="utf-8">UTF-8</option>
            <option value="latin1">Latin-1 / ISO-8859-1</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Mapeamento de colunas (campo → cabeçalho do arquivo)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field} className="text-sm">
                <span className="mb-1 block text-slate-600">{field}</span>
                <input
                  value={columnMap[field] ?? ""}
                  onChange={(e) =>
                    setColumnMap((m) => ({ ...m, [field]: e.target.value }))
                  }
                  placeholder={field}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !file}
            onClick={runDry}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Dry-run
          </button>
          <button
            type="button"
            disabled={busy || !file || !dry}
            onClick={runCommit}
            className="rounded-lg bg-[#2f9e41] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Commit
          </button>
        </div>
      </div>

      {dry ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{summaryText}</p>
          <DataTable
            headers={["Linha", "Status", "CPF", "Avisos/Erros"]}
            empty={
              dry.linhas.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma linha.
                </div>
              ) : null
            }
          >
            {dry.linhas.map((r) => (
              <tr key={r.linha} className="hover:bg-slate-50">
                <td className="px-4 py-2">{r.linha}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {r.dados.cpf ?? "—"}
                </td>
                <td className="px-4 py-2 text-sm text-slate-700">
                  {r.issues.map((i) => i.mensagem).join("; ")}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      ) : null}
    </div>
  );
}
