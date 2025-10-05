export enum Turno {
  INTEGRAL = 'Integral',
  DIURNO = 'Diurno',
  MATUTINO = 'Matutino',
  NOTURNO = 'Noturno',
  VESPERTINO = 'Vespertino',
}

export enum Status_Curso {
  ABERTO = 'Aberto',
  FECHADO = 'Fechado',
}

export enum Modalidade {
  PRESENCIAL = 'Presencial',
  EAD = 'EAD',
  HIBRIDO = 'Híbrido',
}

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
  id_curso: string;
  nome_curso: string;
  duracao_semestres: string;
  campus: Campus;
  modalidade: Modalidade;
  turno: Turno;
  vagas_totais: number;
  vagas_cotas_etnia: number;
  vagas_pcd: number;
  data_inicio_inscricao: Date;
  data_fim_inscricao: Date;
  status_curso: Status_Curso;
}
