/**
 * Enums persistidos em Postgres (`database/01_schemas.sql` + `04_schema_extras.sql`).
 * Os valores precisam ser identicos aos dos CREATE TYPE do banco.
 *
 * Nao confundir com processo-seletivo-enums.ts, que descreve o vocabulario
 * de dominio dos editais no nivel de aplicacao.
 */

/**
 * Postgres converte identificadores nao citados para minusculo, entao os
 * CREATE TYPE em maiusculo do schema viraram tipos em minusculo.
 */
export const PG_ENUM_NAMES = {
  metodoSelecao: 'metodo_selecao',
  meritoTipo: 'merito_tipo',
  termosModo: 'termos_modo',
  turno: 'turno',
  statusCandidatura: 'status_candidatura',
  tipoIngresso: 'tipo_ingresso',
  tipoVaga: 'tipo_vaga',
  etapaProcesso: 'etapa_processo',
  resultadoEtapa: 'resultado_etapa',
  statusRecurso: 'status_recurso',
  tipoContestacao: 'tipo_contestacao',
  statusContestacao: 'status_contestacao',
  origemNotificacao: 'origem_notificacao',
  tipoCarrossel: 'tipo_carrossel',
  tipoEtapaCronograma: 'tipo_etapa_cronograma',
  etapaStatusOverride: 'etapa_status_override',
} as const;

export enum MetodoSelecao {
  ALEATORIO = 'ALEATORIO',
  MERITO = 'MERITO',
  HIBRIDO = 'HIBRIDO',
}

export enum MeritoTipo {
  HISTORICO_ESCOLAR = 'HISTORICO_ESCOLAR',
  NOTA_ENEM = 'NOTA_ENEM',
  PROVA_ESPECIFICA = 'PROVA_ESPECIFICA',
}

export enum TermosModo {
  PDF = 'PDF',
  URL = 'URL',
  TEXTO = 'TEXTO',
}

/** Turno persistido em Ofertas.turno. */
export enum TurnoOferta {
  MATUTINO = 'MATUTINO',
  VESPERTINO = 'VESPERTINO',
  NOTURNO = 'NOTURNO',
  INTEGRAL = 'INTEGRAL',
}

/** Codigos canonicos de cota (DistribuicaoCotas.tipo_cota e Candidaturas.tipo_vaga). */
export const TIPO_COTA_VALUES = [
  'AC',
  'PPI',
  'PCD',
  'ESCOLA_PUBLICA',
  'BAIXA_RENDA',
] as const;

export type TipoCota = (typeof TIPO_COTA_VALUES)[number];

export enum StatusCandidatura {
  INSCRICAO_RECEBIDA = 'inscricao_recebida',
  PRE_SELECIONADO = 'pre_selecionado',
  ANALISE_DOCUMENTAL = 'analise_documental',
  APROVADO = 'aprovado',
  REPROVADO = 'reprovado',
  CANCELADA = 'cancelada',
  DESCLASSIFICADA = 'desclassificada',
}

export enum TipoIngresso {
  SISU = 'sisu',
  SORTEIO = 'sorteio',
  ORDEM_CHEGADA = 'ordem_chegada',
  ANALISE_CURRICULAR = 'analise_curricular',
  TRANSFERENCIA = 'transferencia',
}

/** TIPO_VAGA do banco: alinhado ao vocabulario de cotas. */
export enum TipoVagaCandidatura {
  AC = 'AC',
  PPI = 'PPI',
  PCD = 'PCD',
  ESCOLA_PUBLICA = 'ESCOLA_PUBLICA',
  BAIXA_RENDA = 'BAIXA_RENDA',
}

export enum TipoEtapaProcesso {
  PERIODO_INSCRICOES = 'periodo_inscricoes',
  MANIFESTACAO_INTERESSE = 'manifestacao_interesse',
  ENTREGA_DOCUMENTAL = 'entrega_documental',
  ANALISE_DOCUMENTAL = 'analise_documental',
  PUBLICACAO_RESULTADO_PRELIMINAR = 'publicacao_resultado_preliminar',
  APRESENTACAO_RECURSO = 'apresentacao_recurso',
  ANALISE_RECURSO = 'analise_recurso',
  PUBLICACAO_RESULTADO_FINAL = 'publicacao_resultado_final',
  MATRICULA = 'matricula',
  ENCERRADO = 'encerrado',
}

export enum ResultadoEtapa {
  APROVADO = 'aprovado',
  REPROVADO = 'reprovado',
  PENDENTE = 'pendente',
}

export enum StatusRecurso {
  ABERTO = 'aberto',
  EM_ANALISE = 'em_analise',
  DEFERIDO = 'deferido',
  INDEFERIDO = 'indeferido',
}

/** Documentos.status_documento e VARCHAR no banco, com default 'em_analise'. */
export enum StatusDocumento {
  EM_ANALISE = 'em_analise',
  APROVADO = 'aprovado',
  REPROVADO = 'reprovado',
  REVISAO_MANUAL = 'revisao_manual',
}

/** W2 — Contestacoes.tipo (REQ-1.3 / 5.1). */
export enum TipoContestacao {
  IMPUGNACAO = 'IMPUGNACAO',
  RECURSO = 'RECURSO',
  JUSTIFICATIVA = 'JUSTIFICATIVA',
}

/** W2 — Contestacoes.status cycle. */
export enum StatusContestacao {
  ENVIADA = 'enviada',
  EM_ANALISE = 'em_analise',
  DEFERIDA = 'deferida',
  INDEFERIDA = 'indeferida',
}

/** W2 — Notificacoes.origem (REQ-6.1). */
export enum OrigemNotificacao {
  MANUAL = 'manual',
  AUTOMATICO_CRONOGRAMA = 'automatico_cronograma',
}

/** W2 — CarrosselItens.tipo (REQ-6.2 / RS09). */
export enum TipoCarrossel {
  MANUAL = 'manual',
  AUTO_EDITAL = 'auto_edital',
}

/** W5 — CronogramaEtapas.tipo (REQ-1.2 catalogue). */
export enum TipoEtapaCronograma {
  INSCRICAO = 'INSCRICAO',
  HOMOLOGACAO = 'HOMOLOGACAO',
  SORTEIO_ELETRONICO = 'SORTEIO_ELETRONICO',
  RESULTADO_PRELIMINAR = 'RESULTADO_PRELIMINAR',
  RECURSO_E_IMPUGNACAO = 'RECURSO_E_IMPUGNACAO',
  RESULTADO_FINAL = 'RESULTADO_FINAL',
  MATRICULA = 'MATRICULA',
}

/** W5 — CronogramaEtapas.override (REQ-1.2). */
export enum EtapaStatusOverride {
  AUTOMATICO = 'AUTOMATICO',
  FORCADO_ABERTO = 'FORCADO_ABERTO',
  BLOQUEADO_MANUALMENTE = 'BLOQUEADO_MANUALMENTE',
}
