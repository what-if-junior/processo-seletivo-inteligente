import { Modalidade, Turno } from '@repo/types';

export class CreateCursoDto {
  nome: string;
  duracao_semestres: string;
  campus: string;
  modalidade: Modalidade;
  turno: Turno;
  vagas_totais: number;
  vagas_cotas_pii?: number;
  vagas_pcd?: number;
  /** Formato YYYY-MM-DD. */
  data_inicio_inscricao: string;
  /** Formato YYYY-MM-DD. */
  data_fim_inscricao: string;
  area_conhecimento?: string;
}
