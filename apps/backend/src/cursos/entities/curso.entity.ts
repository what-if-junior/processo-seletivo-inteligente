import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Modalidade, Turno } from '@repo/types';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';

@Entity('Cursos')
export class Curso {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  nome: string;

  @Column({ length: 255 })
  duracao_semestres: string;

  /** VARCHAR livre no banco; os seeds usam o prefixo "Campus ...". */
  @Column({ length: 255 })
  campus: string;

  @Column({ type: 'varchar', length: 255 })
  modalidade: Modalidade;

  @Column({ type: 'varchar', length: 255 })
  turno: Turno;

  @Column({ type: 'smallint' })
  vagas_totais: number;

  @Column({ type: 'smallint', nullable: true })
  vagas_cotas_pii?: number | null;

  @Column({ type: 'smallint', nullable: true })
  vagas_pcd?: number | null;

  @Column({ type: 'date' })
  data_inicio_inscricao: string;

  @Column({ type: 'date' })
  data_fim_inscricao: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area_conhecimento?: string | null;

  @OneToMany(() => Candidatura, (candidatura) => candidatura.curso)
  candidaturas?: Candidatura[];
}
