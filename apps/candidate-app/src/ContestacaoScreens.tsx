"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ApiError } from "./lib/api";
import {
  fetchContestacao,
  fetchElegibilidade,
  fetchMinhasContestacoes,
  postContestacaoCandidato,
  type ContestacaoElegibilidade,
  type ContestacaoRow,
} from "./lib/contestacoes-api";

type ScreenNav = {
  onBack: () => void;
  onOpenMinhas?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  enviada: "Enviada",
  em_analise: "Em análise",
  deferida: "Deferida",
  indeferida: "Indeferida",
};

export function ContestacaoFormScreen({
  editalId,
  candidaturaId,
  defaultTipo = "RECURSO",
  onBack,
  onOpenMinhas,
}: {
  editalId: number;
  candidaturaId: number;
  defaultTipo?: "RECURSO" | "JUSTIFICATIVA";
  onBack: () => void;
  onOpenMinhas?: () => void;
}) {
  const [tipo, setTipo] = useState<"RECURSO" | "JUSTIFICATIVA">(defaultTipo);
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [elig, setElig] = useState<ContestacaoElegibilidade | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    void fetchElegibilidade(editalId)
      .then(setElig)
      .catch(() => setElig(null));
  }, [editalId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!elig?.recurso) {
      setErr("Janela de recurso/justificativa fechada.");
      return;
    }
    setBusy(true);
    try {
      const row = await postContestacaoCandidato({
        tipo,
        id_candidatura: candidaturaId,
        texto,
        file,
      });
      setOk(`Enviado (#${row.id}) — ${STATUS_LABEL[row.status] || row.status}`);
      setTexto("");
      setFile(null);
    } catch (ex) {
      if (ex instanceof ApiError) {
        const body = ex.body as { code?: string; message?: string } | undefined;
        setErr(body?.message || `Falha HTTP ${ex.status}`);
      } else setErr("Falha ao enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#D1E8D7] bg-white">
        <button type="button" onClick={onBack} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5 text-[#0D1E12]" />
        </button>
        <h1 className="text-base font-bold text-[#0D1E12]">Contestação</h1>
      </header>

      {elig?.instrucao ? (
        <div className="mx-4 mt-4 rounded-xl border border-[#D1E8D7] bg-[#F0F6F2] p-3 text-xs text-[#0D1E12] whitespace-pre-wrap">
          <p className="font-semibold mb-1">{elig.instrucao.titulo}</p>
          {elig.instrucao.corpo}
        </div>
      ) : null}

      {!elig?.recurso ? (
        <p className="mx-4 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Recurso/justificativa indisponível no momento.
        </p>
      ) : null}

      {err ? (
        <p className="mx-4 mt-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mx-4 mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          {ok}{" "}
          {onOpenMinhas ? (
            <button
              type="button"
              className="underline font-semibold"
              onClick={onOpenMinhas}
            >
              Ver minhas contestações
            </button>
          ) : null}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="px-4 py-4 space-y-3">
        <label className="block text-sm">
          <span className="font-semibold text-[#0D1E12]">Tipo</span>
          <select
            className="mt-1 w-full rounded-xl border border-[#D1E8D7] px-3 py-2"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as "RECURSO" | "JUSTIFICATIVA")
            }
            disabled={!elig?.recurso || busy}
          >
            <option value="RECURSO">Recurso</option>
            <option value="JUSTIFICATIVA">Justificativa</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-[#0D1E12]">Texto</span>
          <textarea
            className="mt-1 w-full min-h-32 rounded-xl border border-[#D1E8D7] px-3 py-2"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            minLength={3}
            disabled={!elig?.recurso || busy}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-[#0D1E12]">
            Anexo (opcional, ≤5MB)
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={!elig?.recurso || busy}
          />
        </label>
        <button
          type="submit"
          disabled={!elig?.recurso || busy}
          className="w-full h-12 rounded-xl bg-[#2A7B3E] text-white font-bold disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}

export function MinhasContestacoesScreen({ onBack }: ScreenNav) {
  const [rows, setRows] = useState<ContestacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ContestacaoRow | null>(null);

  useEffect(() => {
    void fetchMinhasContestacoes()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(id: number) {
    try {
      setDetail(await fetchContestacao(id));
    } catch {
      setDetail(rows.find((r) => r.id === id) ?? null);
    }
  }

  if (detail) {
    return (
      <div>
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[#D1E8D7] bg-white">
          <button
            type="button"
            onClick={() => setDetail(null)}
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-[#0D1E12]" />
          </button>
          <h1 className="text-base font-bold text-[#0D1E12]">
            Contestação #{detail.id}
          </h1>
        </header>
        <div className="px-4 py-4 space-y-3 text-sm">
          <p>
            <span className="font-semibold">{detail.tipo}</span> ·{" "}
            {STATUS_LABEL[detail.status] || detail.status}
          </p>
          <p className="whitespace-pre-wrap text-[#0D1E12]">{detail.texto}</p>
          {detail.nome_anexo ? (
            <p className="text-[#4E6859]">Anexo: {detail.nome_anexo}</p>
          ) : null}
          <div>
            <p className="font-semibold mb-2">Histórico de respostas</p>
            {(detail.historico || []).length === 0 ? (
              <p className="text-[#4E6859] text-xs">Nenhuma resposta ainda.</p>
            ) : (
              <ul className="space-y-2">
                {(detail.historico || []).map((h) => (
                  <li
                    key={h.id}
                    className="rounded-xl border border-[#D1E8D7] bg-white p-3"
                  >
                    <p className="text-[11px] text-[#4E6859] font-semibold uppercase">
                      {h.canal} · {new Date(h.enviado_em).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{h.corpo}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#D1E8D7] bg-white">
        <button type="button" onClick={onBack} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5 text-[#0D1E12]" />
        </button>
        <h1 className="text-base font-bold text-[#0D1E12]">
          Minhas contestações
        </h1>
      </header>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#2A7B3E]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-[#4E6859] text-center">
          Nenhuma contestação enviada.
        </p>
      ) : (
        <ul className="divide-y divide-[#D1E8D7]">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-[#F0F6F2]"
                onClick={() => void openDetail(r.id)}
              >
                <p className="text-sm font-semibold text-[#0D1E12]">
                  #{r.id} · {r.tipo}
                </p>
                <p className="text-xs text-[#4E6859]">
                  {STATUS_LABEL[r.status] || r.status} ·{" "}
                  {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Hook-friendly fetch for EditalScreen CTAs */
export function useContestacaoElegibilidade(editalId?: number | null) {
  const [elig, setElig] = useState<ContestacaoElegibilidade | null>(null);
  useEffect(() => {
    if (!editalId || editalId <= 0) {
      setElig(null);
      return;
    }
    let cancelled = false;
    void fetchElegibilidade(editalId)
      .then((e) => {
        if (!cancelled) setElig(e);
      })
      .catch(() => {
        if (!cancelled) setElig(null);
      });
    return () => {
      cancelled = true;
    };
  }, [editalId]);
  return elig;
}
