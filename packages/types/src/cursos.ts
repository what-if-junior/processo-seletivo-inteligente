
export enum Turno{
    INTEGRAL = 'Integral',
    DIURNO = 'Diurno',
    MATUTINO = 'Matutino',
    NOTURNO = 'Noturno',
    VESPERTINO = 'Vespertino'
}

export enum Status_Curso{
    ABERTO = 'Aberto',
    FECHADO = 'Fechado',
}

export enum Modalidade {
  PRESENCIAL = 'Presencial',
  EAD = 'EAD'
}

export interface Cursos{
    id_curso: string;
    nome_curso: string;
    duracao_semestres: string;
    campus: string; // caso seja só pro ifb, é enum
    modalidade: Modalidade; // enum mas vamo ver depois
    turno: Turno;
    vagas_totais: number;
    vagas_cotas_etnia: number;
    vagas_pcd: number;
    data_inicio_inscricao: Date;
    data_fim_inscricao: Date;
    status_curso: Status_Curso;
}