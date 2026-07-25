import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PG_ENUM_NAMES, StatusRecurso } from '@repo/types';
import { EtapaProcesso } from '../../etapas-processo/entities/etapa-processo.entity';
import { Gestor } from '../../gestores/entities/gestor.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Recursos')
export class Recurso {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_etapa_processo: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_gestor: number;

  @Column({ type: 'date' })
  data_solicitacao: string;

  @Column({ length: 255 })
  titulo: string;

  @Column({ length: 255 })
  nome_anexo: string;

  @Column({ type: 'bytea', select: false })
  arquivo_anexo: Buffer;

  @Column({
    type: 'enum',
    enum: StatusRecurso,
    enumName: PG_ENUM_NAMES.statusRecurso,
    default: StatusRecurso.ABERTO,
  })
  status: StatusRecurso;

  @Column({ length: 255 })
  observacoes: string;

  @ManyToOne(() => EtapaProcesso, (etapa) => etapa.recursos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_etapa_processo' })
  etapa?: EtapaProcesso;

  @ManyToOne(() => Gestor, (gestor) => gestor.recursos)
  @JoinColumn({ name: 'id_gestor' })
  gestor?: Gestor;
}
