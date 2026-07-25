/**
 * Vocabulary from miro.json enums (editais IFB / cadastro de processo seletivo).
 * Generated — keep in sync with workspace root miro.json.
 * Source: ../../../../miro.json (env workspace) or regenerate via docs sync.
 */

export enum TipoProcessoSeletivo {
  SiSU = 'SiSU',
  Sorteio_Eletronico = 'Sorteio_Eletronico',
  Nota_do_ENEM = 'Nota_do_ENEM',
  Sorteio_Simplificado = 'Sorteio_Simplificado',
  Hibrido = 'Hibrido',
  Submissao_Documental = 'Submissao_Documental',
  Prova_Carta_de_Intencao = 'Prova_Carta_de_Intencao',
}

export const TIPO_PROCESSO_SELETIVO_VALUES = [
  'SiSU',
  'Sorteio_Eletronico',
  'Nota_do_ENEM',
  'Sorteio_Simplificado',
  'Hibrido',
  'Submissao_Documental',
  'Prova_Carta_de_Intencao',
] as const;

export type TipoProcessoSeletivoValue = (typeof TIPO_PROCESSO_SELETIVO_VALUES)[number];

export enum ModalidadeInscricao {
  Online_por_Sistema = 'Online_por_Sistema',
  Online_por_Formulario = 'Online_por_Formulario',
  Presencial = 'Presencial',
  Online = 'Online',
  Hibrido = 'Hibrido',
}

export const MODALIDADE_INSCRICAO_VALUES = [
  'Online_por_Sistema',
  'Online_por_Formulario',
  'Presencial',
  'Online',
  'Hibrido',
] as const;

export type ModalidadeInscricaoValue = (typeof MODALIDADE_INSCRICAO_VALUES)[number];

export enum TipoVaga {
  Ampla_Concorrencia = 'Ampla_Concorrencia',
  Reserva_de_Vagas = 'Reserva_de_Vagas',
  Cota_Racial = 'Cota_Racial',
  Cota_Nao_Racial = 'Cota_Nao_Racial',
  Indigena = 'Indigena',
  PcD = 'PcD',
  Escola_Publica = 'Escola_Publica',
  Vagas_Remanescentes = 'Vagas_Remanescentes',
}

export const TIPO_VAGA_VALUES = [
  'Ampla_Concorrencia',
  'Reserva_de_Vagas',
  'Cota_Racial',
  'Cota_Nao_Racial',
  'Indigena',
  'PcD',
  'Escola_Publica',
  'Vagas_Remanescentes',
] as const;

export type TipoVagaValue = (typeof TIPO_VAGA_VALUES)[number];

export enum StatusHomologacao {
  Homologada = 'Homologada',
  Nao_Homologada = 'Nao_Homologada',
  Indeferida = 'Indeferida',
  Deferida = 'Deferida',
}

export const STATUS_HOMOLOGACAO_VALUES = [
  'Homologada',
  'Nao_Homologada',
  'Indeferida',
  'Deferida',
] as const;

export type StatusHomologacaoValue = (typeof STATUS_HOMOLOGACAO_VALUES)[number];

export enum ResultadoCandidato {
  Aprovado = 'Aprovado',
  Nao_Aprovado = 'Nao_Aprovado',
  Indeferido = 'Indeferido',
  Fila_de_Espera = 'Fila_de_Espera',
  Remanescente = 'Remanescente',
  Contemplado_Sorteio = 'Contemplado_Sorteio',
}

export const RESULTADO_CANDIDATO_VALUES = [
  'Aprovado',
  'Nao_Aprovado',
  'Indeferido',
  'Fila_de_Espera',
  'Remanescente',
  'Contemplado_Sorteio',
] as const;

export type ResultadoCandidatoValue = (typeof RESULTADO_CANDIDATO_VALUES)[number];

export enum EtapaChamada {
  '1a_chamada' = '1a_chamada',
  '2a_chamada' = '2a_chamada',
  '3a_chamada' = '3a_chamada',
  'N_chamadas' = 'N_chamadas',
  'Chamada_Publica' = 'Chamada_Publica',
}

export const ETAPA_CHAMADA_VALUES = [
  '1a_chamada',
  '2a_chamada',
  '3a_chamada',
  'N_chamadas',
  'Chamada_Publica',
] as const;

export type EtapaChamadaValue = (typeof ETAPA_CHAMADA_VALUES)[number];

export enum NiveisEnsinoSuportados {
  Ensino_Medio_Tecnico = 'Ensino_Medio_Tecnico',
  ProEJA = 'ProEJA',
  Tecnico_Subsequente = 'Tecnico_Subsequente',
  Tecnico_Concomitante = 'Tecnico_Concomitante',
  Graduacao = 'Graduacao',
  Pos_Graduacao = 'Pos_Graduacao',
  CQP = 'CQP',
}

export const NIVEIS_ENSINO_SUPORTADOS_VALUES = [
  'Ensino_Medio_Tecnico',
  'ProEJA',
  'Tecnico_Subsequente',
  'Tecnico_Concomitante',
  'Graduacao',
  'Pos_Graduacao',
  'CQP',
] as const;

export type NiveisEnsinoSuportadosValue = (typeof NIVEIS_ENSINO_SUPORTADOS_VALUES)[number];

export enum StatusInscricaoPwa {
  Em_Analise = 'Em_Analise',
  Documentacao_Pendente = 'Documentacao_Pendente',
  Aprovada = 'Aprovada',
  Reprovada = 'Reprovada',
  Recurso = 'Recurso',
  Aguardando_Matricula = 'Aguardando_Matricula',
  Matriculado = 'Matriculado',
  Desclassificado_Prazo = 'Desclassificado_Prazo',
  Revisao_Manual_Necessaria = 'Revisao_Manual_Necessaria',
}

export const STATUS_INSCRICAO_PWA_VALUES = [
  'Em_Analise',
  'Documentacao_Pendente',
  'Aprovada',
  'Reprovada',
  'Recurso',
  'Aguardando_Matricula',
  'Matriculado',
  'Desclassificado_Prazo',
  'Revisao_Manual_Necessaria',
] as const;

export type StatusInscricaoPwaValue = (typeof STATUS_INSCRICAO_PWA_VALUES)[number];
