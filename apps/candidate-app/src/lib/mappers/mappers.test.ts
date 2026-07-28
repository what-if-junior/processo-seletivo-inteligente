import { describe, expect, it } from "vitest";
import {
  StatusCandidatura,
  StatusDocumento,
  TipoVagaCandidatura,
  TipoEtapaProcesso,
  ResultadoEtapa,
  MetodoSelecao,
  TermosModo,
  TurnoOferta,
  type Cursos,
  type Documento,
  type EtapaProcesso,
  type Oferta,
} from "@repo/types";
import {
  statusCandidaturaToBadge,
  isTerminalCandidaturaStatus,
  statusDocumentoToUi,
  cursoToEditalCard,
  cursoInscricaoStatus,
  inferCursoTipo,
  formatPrazoBr,
  ofertaToEditalCard,
  filterEditalCards,
  uniqueEditaisFromCards,
  uniqueCampusesFromCards,
  formatTurnoLabel,
  tipoVagaFromWizard,
  etapaProcessoToCronogramaRow,
  etapasToCronograma,
  documentoToDocUiRow,
  messageFromInscricaoApiError,
  AVISO_UM_CURSO_POR_EDITAL,
} from "./index";
import { ApiError } from "../api";

const baseCurso: Cursos = {
  id: 7,
  nome: "Técnico em Informática",
  eixo_tecnologico: "Informação e Comunicação",
  area_conhecimento: "Informática",
};

const openWindow = {
  data_inicio_inscricao: "2025-01-01",
  data_fim_inscricao: "2026-12-31",
};

describe("statusCandidaturaToBadge", () => {
  it("maps DB statuses to UI badge keys", () => {
    expect(statusCandidaturaToBadge(StatusCandidatura.INSCRICAO_RECEBIDA)).toBe(
      "analise",
    );
    expect(statusCandidaturaToBadge(StatusCandidatura.PRE_SELECIONADO)).toBe(
      "andamento",
    );
    expect(statusCandidaturaToBadge(StatusCandidatura.ANALISE_DOCUMENTAL)).toBe(
      "analise",
    );
    expect(statusCandidaturaToBadge(StatusCandidatura.APROVADO)).toBe(
      "aprovado",
    );
    expect(statusCandidaturaToBadge(StatusCandidatura.REPROVADO)).toBe(
      "reprovado",
    );
    expect(statusCandidaturaToBadge(StatusCandidatura.CANCELADA)).toBe(
      "encerrado",
    );
    expect(statusCandidaturaToBadge(StatusCandidatura.DESCLASSIFICADA)).toBe(
      "reprovado",
    );
  });

  it("detects terminal statuses", () => {
    expect(isTerminalCandidaturaStatus(StatusCandidatura.APROVADO)).toBe(true);
    expect(isTerminalCandidaturaStatus(StatusCandidatura.REPROVADO)).toBe(true);
    expect(isTerminalCandidaturaStatus(StatusCandidatura.CANCELADA)).toBe(true);
    expect(
      isTerminalCandidaturaStatus(StatusCandidatura.ANALISE_DOCUMENTAL),
    ).toBe(false);
  });
});

describe("messageFromInscricaoApiError", () => {
  it("prefers Nest message from ApiError body", () => {
    const err = new ApiError(409, "API 409", {
      message: "Já existe inscrição ativa neste edital.",
      statusCode: 409,
    });
    expect(messageFromInscricaoApiError(err)).toBe(
      "Já existe inscrição ativa neste edital.",
    );
  });

  it("falls back by status when body has no message", () => {
    expect(messageFromInscricaoApiError(new ApiError(409, "x"))).toMatch(
      /inscrição ativa/i,
    );
    expect(messageFromInscricaoApiError(new ApiError(403, "x"))).toMatch(
      /janela efetiva/i,
    );
  });

  it("exposes one-course-per-edital warning copy", () => {
    expect(AVISO_UM_CURSO_POR_EDITAL).toMatch(/uma inscrição ativa por edital/i);
  });
});

describe("statusDocumentoToUi", () => {
  it("maps documento statuses to enviado/pendente", () => {
    expect(statusDocumentoToUi(StatusDocumento.EM_ANALISE)).toBe("enviado");
    expect(statusDocumentoToUi(StatusDocumento.APROVADO)).toBe("enviado");
    expect(statusDocumentoToUi(StatusDocumento.REVISAO_MANUAL)).toBe("enviado");
    expect(statusDocumentoToUi(StatusDocumento.REPROVADO)).toBe("pendente");
    expect(statusDocumentoToUi(null)).toBe("pendente");
  });
});

describe("curso mappers", () => {
  it("formats BR prazo and derives aberto/encerrado", () => {
    expect(formatPrazoBr("2026-12-31")).toBe("31/12/2026");
    expect(
      cursoInscricaoStatus(openWindow, new Date(2026, 5, 15)),
    ).toBe("aberto");
    expect(
      cursoInscricaoStatus(openWindow, new Date(2024, 0, 1)),
    ).toBe("encerrado");
    expect(cursoInscricaoStatus({})).toBe("aberto");
  });

  it("infers tipo heuristically", () => {
    expect(inferCursoTipo(baseCurso)).toBe("Técnico");
    expect(
      inferCursoTipo({
        nome: "Bacharelado em Computação",
        area_conhecimento: "Superior",
      }),
    ).toBe("Superior");
    expect(
      inferCursoTipo({
        nome: "Ensino Médio Regular",
        area_conhecimento: null,
      }),
    ).toBe("Médio");
  });

  it("maps slim Curso → EditalCard with placeholders", () => {
    const card = cursoToEditalCard(
      baseCurso,
      new Date(2026, 5, 15),
      openWindow,
    );
    expect(card).toMatchObject({
      id: "7",
      id_oferta: 7,
      id_edital: 7,
      titulo: "Técnico em Informática",
      campus: "—",
      vagas: 0,
      status: "aberto",
      tipo: "Técnico",
      area_conhecimento: "Informática",
    });
    expect(card.prazo).toBe("31/12/2026");
    expect(card.sub).toBe("Informação e Comunicação");
  });
});

describe("oferta mappers (W16 / M-06)", () => {
  const baseOferta: Oferta = {
    id: 42,
    id_edital: 10,
    id_curso: 7,
    id_campus: 3,
    turno: TurnoOferta.NOTURNO,
    vagas_totais: 40,
    edital: {
      id: 10,
      numero_ano: "2025.1-IFB",
      metodo_selecao: MetodoSelecao.ALEATORIO,
      is_simplificado: false,
      fallback_ac_para_rv: false,
      termos_modo: TermosModo.TEXTO,
      termos_valor: "",
      publicado: true,
      inscricoes_abertas: true,
    },
    curso: baseCurso,
    campus: { id: 3, nome: "Campus Planaltina" },
  };

  it("maps Oferta → EditalCard with real ids and campus/turno/área", () => {
    const card = ofertaToEditalCard(baseOferta, new Date(2026, 5, 15));
    expect(card).toMatchObject({
      id: "42",
      id_oferta: 42,
      id_edital: 10,
      titulo: "Técnico em Informática",
      editalLabel: "2025.1-IFB",
      campus: "Campus Planaltina",
      id_campus: 3,
      turno: "Noturno",
      area_conhecimento: "Informática",
      vagas: 40,
      status: "aberto",
      tipo: "Técnico",
    });
  });

  it("marks encerrado when inscricoes_abertas is false", () => {
    const card = ofertaToEditalCard({
      ...baseOferta,
      edital: {
        ...baseOferta.edital!,
        inscricoes_abertas: false,
      },
    });
    expect(card.status).toBe("encerrado");
    expect(card.prazo).toBe("Encerrado");
  });

  it("formats turno labels", () => {
    expect(formatTurnoLabel(TurnoOferta.MATUTINO)).toBe("Matutino");
    expect(formatTurnoLabel(undefined)).toBe("—");
  });

  it("filters by processo, campus, search and tipo", () => {
    const cards = [
      ofertaToEditalCard(baseOferta),
      ofertaToEditalCard({
        ...baseOferta,
        id: 43,
        id_edital: 11,
        id_campus: 4,
        edital: {
          ...baseOferta.edital!,
          id: 11,
          numero_ano: "2025.1-OUTRO",
        },
        campus: { id: 4, nome: "Campus Gama" },
        curso: {
          id: 8,
          nome: "Bacharelado em Computação",
          area_conhecimento: "Superior",
        },
      }),
    ];
    expect(filterEditalCards(cards, { id_edital: 10 })).toHaveLength(1);
    expect(filterEditalCards(cards, { id_campus: 4 })).toHaveLength(1);
    expect(filterEditalCards(cards, { search: "planaltina" })).toHaveLength(1);
    expect(filterEditalCards(cards, { tipo: "Superior" })).toHaveLength(1);
    expect(uniqueEditaisFromCards(cards)).toEqual([
      { id: 10, label: "2025.1-IFB" },
      { id: 11, label: "2025.1-OUTRO" },
    ]);
    expect(uniqueCampusesFromCards(cards).map((c) => c.label)).toEqual([
      "Campus Gama",
      "Campus Planaltina",
    ]);
  });
});

describe("tipoVagaFromWizard", () => {
  it("maps cotas to TipoVagaCandidatura", () => {
    expect(tipoVagaFromWizard("ppi")).toBe(TipoVagaCandidatura.PPI);
    expect(tipoVagaFromWizard("pcd")).toBe(TipoVagaCandidatura.PCD);
    expect(tipoVagaFromWizard("renda")).toBe(TipoVagaCandidatura.BAIXA_RENDA);
    expect(tipoVagaFromWizard("nenhuma", "priv")).toBe(TipoVagaCandidatura.AC);
    expect(tipoVagaFromWizard("nenhuma", "pub")).toBe(
      TipoVagaCandidatura.ESCOLA_PUBLICA,
    );
  });
});

describe("etapa mappers", () => {
  const etapa = {
    tipo_etapa: TipoEtapaProcesso.ANALISE_DOCUMENTAL,
    status: ResultadoEtapa.PENDENTE,
    data_realizacao: "2026-01-10",
    prazo: "2026-01-20",
    observacoes: "",
  } satisfies Pick<
    EtapaProcesso,
    "tipo_etapa" | "status" | "data_realizacao" | "prazo" | "observacoes"
  >;

  it("maps etapa → cronograma row (best-effort)", () => {
    expect(etapaProcessoToCronogramaRow(etapa)).toEqual({
      data: "10/01/2026",
      etapa: "Análise Documental",
      st: "active",
    });
  });

  it("sorts etapas by data_realizacao", () => {
    const rows = etapasToCronograma([
      { ...etapa, data_realizacao: "2026-02-01", status: ResultadoEtapa.APROVADO },
      etapa,
    ]);
    expect(rows[0]?.data).toBe("10/01/2026");
    expect(rows[1]?.st).toBe("done");
  });
});

describe("documentoToDocUiRow", () => {
  it("maps API documento to docs UI row", () => {
    const doc: Documento = {
      id: 3,
      id_candidatura: 1,
      tipo_documento: "Foto para Autodeclaração",
      nome_arquivo: "face.jpg",
      status_documento: StatusDocumento.EM_ANALISE,
      criado_em: new Date(),
    };
    expect(documentoToDocUiRow(doc)).toMatchObject({
      id: "3",
      nome: "Foto para Autodeclaração",
      status: "enviado",
      tipo: "camera",
      obrigatorio: true,
    });
  });
});
