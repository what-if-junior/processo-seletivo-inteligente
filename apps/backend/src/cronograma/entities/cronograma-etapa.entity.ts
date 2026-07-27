import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  EtapaStatusOverride,
  PG_ENUM_NAMES,
  TipoEtapaCronograma,
} from '@repo/types';
import { numericTransformer } from '../../common/transformers';
import { Edital } from '../../editais/entities/edital.entity';
import { TemplateEdital } from '../../templates/entities/template-edital.entity';

/** Tabela "CronogramaEtapas": etapas do edital (REQ-1.2). ≠ "Etapas Processo". */
@Entity('CronogramaEtapas')
export class CronogramaEtapa {
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
    type: 'enum',
    enum: TipoEtapaCronograma,
    enumName: PG_ENUM_NAMES.tipoEtapaCronograma,
  })
  tipo: TipoEtapaCronograma;

  @Column({ length: 255 })
  nome_exibido: string;

  @Column({ type: 'timestamp' })
  data_inicio: Date;

  @Column({ type: 'timestamp' })
  data_fim: Date;

  @Column({ type: 'text', nullable: true })
  descricao?: string | null;

  @Column({ type: 'int' })
  ordem: number;

  @Column({
    type: 'enum',
    enum: EtapaStatusOverride,
    enumName: PG_ENUM_NAMES.etapaStatusOverride,
    default: EtapaStatusOverride.AUTOMATICO,
  })
  override: EtapaStatusOverride;

  @Column({ type: 'boolean', default: false })
  elegivel_impugnacao: boolean;

  @Column({ type: 'boolean', default: false })
  elegivel_recurso: boolean;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  template_instrucao_id?: number | null;

  @ManyToOne(() => Edital, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;

  @ManyToOne(() => TemplateEdital, { nullable: true })
  @JoinColumn({ name: 'template_instrucao_id' })
  templateInstrucao?: TemplateEdital | null;
}
