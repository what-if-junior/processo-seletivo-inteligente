"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";
import {
  MOCK_INSCRICOES,
  type AdminInscricao,
  type DataSource,
} from "./mocks";
import type { Candidatura, Usuario } from "@repo/types";
import { type AdminCandidatoRow, MOCK_CANDIDATOS } from "./mocks";

function normalizeInscricao(c: Candidatura): AdminInscricao {
  return {
    ...c,
    observacoes_admin: "",
  };
}

export function useInscricoes() {
  const [data, setData] = useState<AdminInscricao[]>([]);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await apiFetch<Candidatura[]>("/candidaturas");
        if (cancelled) return;
        setData(list.map(normalizeInscricao));
        setSource("api");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData(MOCK_INSCRICOES);
        setSource("mock");
        setError(
          e instanceof ApiError
            ? `API indisponível (${e.status}); exibindo dados de demonstração.`
            : "API indisponível; exibindo dados de demonstração.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, source, loading, error };
}

export function useInscricao(id: number) {
  const [data, setData] = useState<AdminInscricao | null>(null);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const item = await apiFetch<Candidatura>(`/candidaturas/${id}`);
        if (cancelled) return;
        setData(normalizeInscricao(item));
        setSource("api");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        const mock = MOCK_INSCRICOES.find((i) => i.id === id) ?? null;
        setData(mock);
        setSource("mock");
        if (!mock) {
          setError("Inscrição não encontrada.");
        } else {
          setError(
            e instanceof ApiError
              ? `API indisponível (${e.status}); exibindo dados de demonstração.`
              : "API indisponível; exibindo dados de demonstração.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, setData, source, loading, error };
}

export function useCandidatos() {
  const [data, setData] = useState<AdminCandidatoRow[]>([]);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const users = await apiFetch<Usuario[]>("/user");
        if (cancelled) return;
        setData(
          users.map((u) => ({
            id: u.id,
            nome: u.nome_completo,
            email: u.email,
            status: (u.ativo === false ? "inativo" : "ativo") as
              | "ativo"
              | "inativo",
            data_cadastro: u.criado_em
              ? new Date(u.criado_em).toISOString().slice(0, 10)
              : "—",
            telefone: u.telefone,
          })),
        );
        setSource("api");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData(MOCK_CANDIDATOS);
        setSource("mock");
        setError(
          e instanceof ApiError
            ? `API indisponível (${e.status}); exibindo dados de demonstração.`
            : "API indisponível; exibindo dados de demonstração.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    data,
    source,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}
