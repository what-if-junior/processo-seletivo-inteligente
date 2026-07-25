export enum Turno {
  INTEGRAL = 'Integral',
  DIURNO = 'Diurno',
  MATUTINO = 'Matutino',
  NOTURNO = 'Noturno',
  VESPERTINO = 'Vespertino',
}

/** Ainda nao persistido: "Cursos" nao tem coluna de status no schema atual. */
export enum Status_Curso {
  ABERTO = 'Aberto',
  FECHADO = 'Fechado',
}

export enum Modalidade {
  PRESENCIAL = 'Presencial',
  EAD = 'EAD',
  HIBRIDO = 'Híbrido',
}

/**
 * Lista canonica dos campi. A coluna "campus" e VARCHAR livre no banco e os
 * dados de seed usam o prefixo "Campus ...", por isso Cursos.campus e string.
 */
export enum Campus {
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

export interface Cursos {
  id: number;
  nome: string;
  duracao_semestres: string;
  campus: string;
  modalidade: Modalidade;
  turno: Turno;
  vagas_totais: number;
  vagas_cotas_pii?: number | null;
  vagas_pcd?: number | null;
  data_inicio_inscricao: string;
  data_fim_inscricao: string;
  area_conhecimento?: string | null;
}
