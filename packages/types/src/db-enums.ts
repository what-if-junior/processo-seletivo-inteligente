/**
 * Enums persistidos em Postgres, definidos em database/01_schemas.sql.
 * Os valores precisam ser identicos aos dos CREATE TYPE do banco.
 *
 * Nao confundir com processo-seletivo-enums.ts, que descreve o vocabulario
 * de dominio dos editais e ainda nao esta persistido.
 */

/**
 * Postgres converte identificadores nao citados para minusculo, entao os
 * CREATE TYPE em maiusculo do schema viraram tipos em minusculo.
 */
export const PG_ENUM_NAMES = {
  statusCandidatura: 'status_candidatura',
  tipoIngresso: 'tipo_ingresso',
  tipoVaga: 'tipo_vaga',
  etapaProcesso: 'etapa_processo',
  resultadoEtapa: 'resultado_etapa',
  statusRecurso: 'status_recurso',
} as const;

export enum StatusCandidatura {
  INSCRICAO_RECEBIDA = 'inscricao_recebida',
  PRE_SELECIONADO = 'pre_selecionado',
  ANALISE_DOCUMENTAL = 'analise_documental',
  APROVADO = 'aprovado',
  REPROVADO = 'reprovado',
}

export enum TipoIngresso {
  SISU = 'sisu',
  SORTEIO = 'sorteio',
  ORDEM_CHEGADA = 'ordem_chegada',
  ANALISE_CURRICULAR = 'analise_curricular',
  TRANSFERENCIA = 'transferencia',
}

/** TIPO_VAGA do banco: ampla concorrencia, PcD, preto/pardo/indigena, escola publica. */
export enum TipoVagaCandidatura {
  AC = 'AC',
  PCD = 'PCD',
  PII = 'PII',
  ESCOLA_PUBLICA = 'escola_publica',
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
