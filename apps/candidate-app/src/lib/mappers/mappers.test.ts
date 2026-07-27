import { describe, expect, it } from "vitest";
import {
  StatusCandidatura,
  StatusDocumento,
  TipoVagaCandidatura,
  TipoEtapaProcesso,
  ResultadoEtapa,
  type Cursos,
  type Documento,
  type EtapaProcesso,
} from "@repo/types";
import {
  statusCandidaturaToBadge,
  isTerminalCandidaturaStatus,
  statusDocumentoToUi,
  cursoToEditalCard,
  cursoInscricaoStatus,
  inferCursoTipo,
  formatPrazoBr,
  tipoVagaFromWizard,
  etapaProcessoToCronogramaRow,
  etapasToCronograma,
  documentoToDocUiRow,
} from "./index";

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
      titulo: "Técnico em Informática",
      campus: "—",
      vagas: 0,
      status: "aberto",
      tipo: "Técnico",
    });
    expect(card.prazo).toBe("31/12/2026");
    expect(card.sub).toBe("Informação e Comunicação");
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
