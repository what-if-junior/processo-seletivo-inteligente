/** Turno de exibicao legado (UI/mocks). Ofertas usam TurnoOferta em db-enums. */
export enum Turno {
  INTEGRAL = 'Integral',
  DIURNO = 'Diurno',
  MATUTINO = 'Matutino',
  NOTURNO = 'Noturno',
  VESPERTINO = 'Vespertino',
}

/** Ainda nao persistido: catalogo de cursos nao tem status no schema W1. */
export enum Status_Curso {
  ABERTO = 'Aberto',
  FECHADO = 'Fechado',
}

export enum Modalidade {
  PRESENCIAL = 'Presencial',
  EAD = 'EAD',
  HIBRIDO = 'Híbrido',
}

/** Nomes canonicos dos campi IFB (tabela Campus.nome). */
export enum CampusNome {
  BRASILIA = 'Brasília',
  CEILANDIA = 'Ceilândia',
  ESTRUTURAL = 'Estrutural',
  GAMA = 'Gama',
  PLANALTINA = 'Planaltina',
  RECANTO_DAS_EMAS = 'Recanto das Emas',
  RIACHO_FUNDO = 'Riacho Fundo',
  SAMAMBAIA = 'Samambaia',
  SAO_SEBASTIAO = 'São Sebastião',
  TAGUATINGA = 'Taguatinga',
  SOL_NASCENTE = 'Sol Nascente (Campus em construção)',
  SOBRADINHO = 'Sobradinho (Campus em construção)',
}

/** @deprecated Use CampusNome — alias mantido para mocks legados. */
export const Campus = CampusNome;

/** Catalogo slim de cursos (W1). Vagas/turno/campus ficam em Ofertas. */
export interface Cursos {
  id: number;
  nome: string;
  eixo_tecnologico?: string | null;
  requisito_escolaridade?: string | null;
  area_conhecimento?: string | null;
}
