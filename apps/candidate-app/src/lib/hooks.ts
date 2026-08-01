import { useEffect, useState } from "react";
import type {
  Candidatura,
  Cursos,
  Documento,
  Oferta,
  Usuario,
} from "@repo/types";
import { apiFetch, apiFetchBlob } from "./api";
import {
  cursoToEditalCard,
  documentoToDocUiRow,
  isTerminalCandidaturaStatus,
  ofertaToEditalCard,
  statusCandidaturaToBadge,
  type DocUiRow,
  type EditalCard,
} from "./mappers";
import {
  fetchCurrentUser,
  getSessionUserId,
  shouldUseMocks,
} from "./session";

export type DataSource = "api" | "mock" | "empty";

export function useCursos(fallback: EditalCard[]) {
  const [editais, setEditais] = useState<EditalCard[]>(fallback);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shouldUseMocks()) {
      setEditais(fallback);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<Cursos[]>("/cursos");
        if (cancelled) return;
        setEditais(list.map((c) => cursoToEditalCard(c)));
        setSource(list.length ? "api" : "empty");
        setError(null);
      } catch {
        if (cancelled) return;
        setEditais([]);
        setSource("empty");
        setError("Não foi possível carregar os cursos. Tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return { editais, source, loading, error };
}

/** Home / Processos: public `GET /ofertas` with mock only when mocks flag is on. */
export function useOfertas(fallback: EditalCard[]) {
  const [editais, setEditais] = useState<EditalCard[]>(
    shouldUseMocks() ? fallback : [],
  );
  const [source, setSource] = useState<DataSource>(
    shouldUseMocks() ? "mock" : "empty",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shouldUseMocks()) {
      setEditais(fallback);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<Oferta[]>("/ofertas");
        if (cancelled) return;
        setEditais(list.map((o) => ofertaToEditalCard(o)));
        setSource(list.length ? "api" : "empty");
        setError(null);
      } catch {
        if (cancelled) return;
        setEditais([]);
        setSource("empty");
        setError("Não foi possível carregar as ofertas. Tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);

  return { editais, source, loading, error };
}

export type InscricaoCard = {
  id: number;
  id_oferta?: number;
  curso: string;
  campus: string;
  status: string;
  statusBadge: string;
  data: string;
  protocolo: string;
  isActive: boolean;
};

const MOCK_ACTIVE: InscricaoCard = {
  id: 0,
  id_oferta: 3,
  curso: "Técnico em Hotelaria",
  campus: "Campus Planaltina",
  status: "analise_documental",
  statusBadge: "analise",
  data: "14/11/2024",
  protocolo: "IFB-2025-00847",
  isActive: true,
};

const MOCK_PAST: InscricaoCard[] = [
  {
    id: -1,
    id_oferta: 4,
    curso: "Técnico em Moda",
    campus: "Campus Samambaia",
    status: "reprovado",
    statusBadge: "reprovado",
    data: "2024.1",
    protocolo: "",
    isActive: false,
  },
  {
    id: -2,
    id_oferta: 5,
    curso: "Ensino Médio Integrado",
    campus: "Campus Gama",
    status: "aprovado",
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
  const cursoNome = c.oferta?.curso?.nome;
  const campusNome = c.oferta?.campus?.nome;
  return {
    id: c.id,
    id_oferta: c.id_oferta,
    curso: cursoNome ?? `Oferta #${c.id_oferta}`,
    campus: campusNome ?? "—",
    status: String(c.status),
    statusBadge: statusCandidaturaToBadge(c.status),
    data: formatInscricaoDate(c.data_inscricao),
    protocolo: c.protocolo ?? "",
    isActive: !isTerminalCandidaturaStatus(c.status),
  };
}

export function useInscricoes() {
  const [active, setActive] = useState<InscricaoCard | null>(
    shouldUseMocks() ? MOCK_ACTIVE : null,
  );
  const [past, setPast] = useState<InscricaoCard[]>(
    shouldUseMocks() ? MOCK_PAST : [],
  );
  const [source, setSource] = useState<DataSource>(
    shouldUseMocks() ? "mock" : "empty",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => setReloadToken((n) => n + 1);

  useEffect(() => {
    if (shouldUseMocks()) {
      setActive(MOCK_ACTIVE);
      setPast(MOCK_PAST);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }
    const userId = getSessionUserId();
    if (userId == null) {
      setActive(null);
      setPast([]);
      setSource("empty");
      setError(null);
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
        setError(null);
      } catch {
        if (cancelled) return;
        setActive(null);
        setPast([]);
        setSource("empty");
        setError("Não foi possível carregar suas inscrições.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function cancelActive(): Promise<void> {
    if (shouldUseMocks() || !active || active.id <= 0) {
      throw new Error("Cancelamento indisponível no modo demonstração.");
    }
    await apiFetch(`/candidaturas/${active.id}/cancelar`, { method: "PATCH" });
    reload();
  }

  async function downloadComprovante(): Promise<void> {
    if (shouldUseMocks() || !active || active.id <= 0) {
      throw new Error("Comprovante indisponível no modo demonstração.");
    }
    const blob = await apiFetchBlob(
      `/candidaturas/${active.id}/comprovante.pdf`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante-${active.protocolo || active.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    active,
    past,
    source,
    loading,
    error,
    reload,
    cancelActive,
    downloadComprovante,
  };
}

export function useDocumentos(
  candidaturaId: number | null,
  fallback: DocUiRow[],
) {
  const [docs, setDocs] = useState<DocUiRow[]>([]);
  const [source, setSource] = useState<DataSource>("empty");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => setReloadToken((n) => n + 1);

  useEffect(() => {
    if (shouldUseMocks()) {
      setDocs(fallback);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }
    if (candidaturaId == null || candidaturaId <= 0) {
      setDocs([]);
      setSource("empty");
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await apiFetch<Documento[]>(
          `/documentos?candidatura=${candidaturaId}`,
        );
        if (cancelled) return;
        if (!list.length) {
          setDocs([]);
          setSource("empty");
        } else {
          setDocs(list.map(documentoToDocUiRow));
          setSource("api");
        }
        setError(null);
      } catch {
        if (cancelled) return;
        setDocs([]);
        setSource("empty");
        setError("Não foi possível carregar os documentos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidaturaId, fallback, reloadToken]);

  return { docs, source, loading, error, reload };
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
