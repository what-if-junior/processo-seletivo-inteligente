import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Modalidade, Status_Curso, Turno } from '@repo/types';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn('uuid')
  id_curso: string;

  @Column()
  nome_curso: string;

  @Column()
  duracao_semestres: string;

  @Column()
  campus: string;

  @Column({
    type: 'enum',
    enum: Modalidade,
  })
  modalidade: Modalidade;

  @Column({
    type: 'enum',
    enum: Turno,
  })
  turno: Turno;

  @Column()
  vagas_totais: number;

  @Column()
  vagas_cotas_etnia: number;

  @Column()
  vagas_pcd: number;

  @Column({ type: 'timestamp' })
  data_inicio_inscricao: Date;

  @Column({ type: 'timestamp' })
  data_fim_inscricao: Date;

  @Column({
    type: 'enum',
    enum: Status_Curso,
  })
  status_curso: Status_Curso;
}
