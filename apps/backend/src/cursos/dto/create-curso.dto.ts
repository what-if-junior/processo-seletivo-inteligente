import { Turno, Modalidade, Status_Curso, Campus } from "@repo/types";

export class CreateCursoDto {
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
