"use client";

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  buildImpugnacaoMailto,
  fetchElegibilidade,
  postImpugnacao,
  type ContestacaoElegibilidade,
} from "../../src/lib/contestacoes-api";
import { ApiError } from "../../src/lib/api";

function ImpugnacaoForm() {
  const params = useSearchParams();
  const editalId = Number(params.get("edital") || "");
  const [elig, setElig] = useState<ContestacaoElegibilidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(editalId) || editalId <= 0) {
      setLoading(false);
      setErr("Informe ?edital=ID na URL.");
      return;
    }
    void fetchElegibilidade(editalId)
      .then(setElig)
      .catch(() => setErr("Não foi possível carregar elegibilidade do edital."))
      .finally(() => setLoading(false));
  }, [editalId]);

  const mailtoHref = useMemo(() => {
    if (!elig?.mailto_template?.corpo) return null;
    return buildImpugnacaoMailto({
      templateCorpo: elig.mailto_template.corpo,
      editalId,
      nome: nome || "Nome",
      email: email || "email@exemplo.com",
      texto: texto || "(escreva o fundamento)",
    });
  }, [elig, editalId, nome, email, texto]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!elig?.impugnacao) {
      setErr("Janela de impugnação fechada para este edital.");
      return;
    }
    setBusy(true);
    try {
      const row = await postImpugnacao({
        id_edital: editalId,
        texto,
        nome_requerente: nome,
        email_requerente: email,
        file,
      });
      setMsg(`Impugnação enviada (id ${row.id}, status ${row.status}).`);
      setTexto("");
      setFile(null);
    } catch (ex) {
      if (ex instanceof ApiError) {
        const body = ex.body as { code?: string; message?: string } | undefined;
        setErr(
          body?.code === "ETAPA_CONTESTACAO_FECHADA"
            ? "Etapa de contestação fechada."
            : body?.message || `Falha HTTP ${ex.status}`,
        );
      } else {
        setErr("Falha ao enviar impugnação.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-slate-600">Carregando…</p>;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0D1E12]">Impugnação</h1>
      <p className="mt-1 text-sm text-[#4E6859]">
        Envio público sem login — Edital #{editalId || "—"}.
      </p>

      {elig?.instrucao ? (
        <div className="mt-4 rounded-xl border border-[#D1E8D7] bg-[#F0F6F2] p-4 text-sm text-[#0D1E12]">
          <p className="font-semibold">{elig.instrucao.titulo}</p>
          <p className="mt-2 whitespace-pre-wrap">{elig.instrucao.corpo}</p>
        </div>
      ) : null}

      {!elig?.impugnacao ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Impugnação indisponível (etapa fechada ou sem elegibilidade).
        </p>
      ) : null}

      {err ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {msg}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-[#0D1E12]">Nome</span>
          <input
            className="mt-1 w-full rounded-lg border border-[#D1E8D7] px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            disabled={!elig?.impugnacao || busy}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[#0D1E12]">E-mail</span>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-[#D1E8D7] px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!elig?.impugnacao || busy}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[#0D1E12]">Fundamento</span>
          <textarea
            className="mt-1 min-h-32 w-full rounded-lg border border-[#D1E8D7] px-3 py-2"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            minLength={3}
            disabled={!elig?.impugnacao || busy}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[#0D1E12]">
            Anexo (opcional, PDF/JPEG/PNG ≤5MB)
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={!elig?.impugnacao || busy}
          />
        </label>
        <button
          type="submit"
          disabled={!elig?.impugnacao || busy}
          className="w-full rounded-xl bg-[#2A7B3E] py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Enviar impugnação"}
        </button>
      </form>

      {mailtoHref ? (
        <div className="mt-6 border-t border-[#D1E8D7] pt-4">
          <p className="text-sm text-[#4E6859]">
            Ou envie por e-mail usando o modelo do edital:
          </p>
          <a
            href={mailtoHref}
            className="mt-2 inline-block text-sm font-semibold text-[#2A7B3E] underline"
          >
            Abrir cliente de e-mail
          </a>
        </div>
      ) : null}
    </main>
  );
}

export default function ImpugnacaoPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Carregando…</p>}>
      <ImpugnacaoForm />
    </Suspense>
  );
}
