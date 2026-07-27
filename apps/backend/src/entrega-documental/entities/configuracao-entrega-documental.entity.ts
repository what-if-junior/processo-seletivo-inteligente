import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  ModoEntrega,
  PG_ENUM_NAMES,
  SubtipoEntregaOnline,
} from '@repo/types';
import { numericTransformer } from '../../common/transformers';
import { Edital } from '../../editais/entities/edital.entity';
import { Campus } from '../../campus/entities/campus.entity';
import { Curso } from '../../cursos/entities/curso.entity';
import { CronogramaEtapa } from '../../cronograma/entities/cronograma-etapa.entity';

/**
 * Tabela "ConfiguracaoEntregaDocumental":
 * vínculo Edital ↔ Campus/Curso ↔ CronogramaEtapa (REQ-1.6).
 */
@Entity('ConfiguracaoEntregaDocumental')
export class ConfiguracaoEntregaDocumental {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_edital: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_campus: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_curso: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_cronograma_etapa: number;

  @Column({
    type: 'enum',
    enum: ModoEntrega,
    enumName: PG_ENUM_NAMES.modoEntrega,
  })
  modo: ModoEntrega;

  @Column({ type: 'varchar', length: 255, nullable: true })
  local_nome?: string | null;

  @Column({ type: 'text', nullable: true })
  endereco?: string | null;

  @Column({ type: 'text', nullable: true })
  horario?: string | null;

  @Column({ type: 'text', nullable: true })
  contactos?: string | null;

  @Column({
    type: 'enum',
    enum: SubtipoEntregaOnline,
    enumName: PG_ENUM_NAMES.subtipoEntregaOnline,
    nullable: true,
  })
  subtipo_online?: SubtipoEntregaOnline | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  url_externa?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_institucional?: string | null;

  @Column({ type: 'text', nullable: true })
  instrucoes?: string | null;

  @ManyToOne(() => Edital, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;

  @ManyToOne(() => Campus)
  @JoinColumn({ name: 'id_campus' })
  campus?: Campus;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'id_curso' })
  curso?: Curso;

  @ManyToOne(() => CronogramaEtapa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cronograma_etapa' })
  cronogramaEtapa?: CronogramaEtapa;
}
