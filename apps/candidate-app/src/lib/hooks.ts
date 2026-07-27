import { useEffect, useState } from "react";
import type { Candidatura, Cursos, Documento, Usuario } from "@repo/types";
import { apiFetch } from "./api";
import {
  cursoToEditalCard,
  documentoToDocUiRow,
  isTerminalCandidaturaStatus,
  statusCandidaturaToBadge,
  type DocUiRow,
  type EditalCard,
} from "./mappers";
import {
  fetchCurrentUser,
  getSessionUserId,
  shouldUseMocks,
} from "./session";

export type DataSource = "api" | "mock";

export function useCursos(fallback: EditalCard[]) {
  const [editais, setEditais] = useState<EditalCard[]>(fallback);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shouldUseMocks()) {
      setEditais(fallback);
      setSource("mock");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<Cursos[]>("/cursos");
        if (cancelled) return;
        if (!list.length) {
          setEditais(fallback);
          setSource("mock");
        } else {
          setEditais(list.map((c) => cursoToEditalCard(c)));
          setSource("api");
        }
      } catch {
        if (cancelled) return;
        setEditais(fallback);
        setSource("mock");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return { editais, source, loading };
}

export type InscricaoCard = {
  id: number;
  curso: string;
  campus: string;
  statusBadge: string;
  data: string;
  protocolo: string;
  isActive: boolean;
};

const MOCK_ACTIVE: InscricaoCard = {
  id: 0,
  curso: "Técnico em Hotelaria",
  campus: "Campus Planaltina",
  statusBadge: "analise",
  data: "14/11/2024",
  protocolo: "IFB-2025-00847",
  isActive: true,
};

const MOCK_PAST: InscricaoCard[] = [
  {
    id: -1,
    curso: "Técnico em Moda",
    campus: "Campus Samambaia",
    statusBadge: "reprovado",
    data: "2024.1",
    protocolo: "",
    isActive: false,
  },
  {
    id: -2,
    curso: "Ensino Médio Integrado",
    campus: "Campus Gama",
    statusBadge: "aprovado",
    data: "2023.2",
    protocolo: "",
    isActive: false,
  },
];

function formatInscricaoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function candidaturaToCard(c: Candidatura): InscricaoCard {
  return {
    id: c.id,
    curso: c.curso?.nome ?? `Curso #${c.id_curso}`,
    campus: c.curso?.campus ?? "—",
    statusBadge: statusCandidaturaToBadge(c.status),
    data: formatInscricaoDate(c.data_inscricao),
    protocolo: `IFB-${c.id}`, // protocol column missing — mock-ish placeholder
    isActive: !isTerminalCandidaturaStatus(c.status),
  };
}

export function useInscricoes() {
  const [active, setActive] = useState<InscricaoCard | null>(MOCK_ACTIVE);
  const [past, setPast] = useState<InscricaoCard[]>(MOCK_PAST);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shouldUseMocks()) {
      setActive(MOCK_ACTIVE);
      setPast(MOCK_PAST);
      setSource("mock");
      setLoading(false);
      return;
    }
    const userId = getSessionUserId();
    if (userId == null) {
      setActive(MOCK_ACTIVE);
      setPast(MOCK_PAST);
      setSource("mock");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<Candidatura[]>(
          `/candidaturas?usuario=${userId}`,
        );
        if (cancelled) return;
        const cards = list.map(candidaturaToCard);
        const actives = cards.filter((c) => c.isActive);
        const pasts = cards.filter((c) => !c.isActive);
        setActive(actives[0] ?? null);
        setPast(pasts.length ? pasts : []);
        setSource("api");
      } catch {
        if (cancelled) return;
        setActive(MOCK_ACTIVE);
        setPast(MOCK_PAST);
        setSource("mock");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { active, past, source, loading };
}

export function useDocumentos(
  candidaturaId: number | null,
  fallback: DocUiRow[],
) {
  const [docs, setDocs] = useState<DocUiRow[]>(fallback);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shouldUseMocks() || candidaturaId == null || candidaturaId <= 0) {
      setDocs(fallback);
      setSource("mock");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<Documento[]>(
          `/documentos?candidatura=${candidaturaId}`,
        );
        if (cancelled) return;
        if (!list.length) {
          setDocs(fallback);
          setSource("mock");
        } else {
          setDocs(list.map(documentoToDocUiRow));
          setSource("api");
        }
      } catch {
        if (cancelled) return;
        setDocs(fallback);
        setSource("mock");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidaturaId, fallback]);

  return { docs, source, loading };
}

export function useProfile() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      if (!getSessionUserId()) {
        setUser(null);
        setAuthed(false);
        return;
      }
      const u = await fetchCurrentUser();
      setUser(u);
      setAuthed(!!u);
    } catch {
      setUser(null);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { user, loading, authed, refresh, setUser, setAuthed };
}
