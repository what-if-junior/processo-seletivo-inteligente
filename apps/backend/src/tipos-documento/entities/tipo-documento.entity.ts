import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FaseDocumento, PG_ENUM_NAMES } from '@repo/types';
import { numericTransformer } from '../../common/transformers';
import { Edital } from '../../editais/entities/edital.entity';
import { TipoDocumentoBase } from '../../tipos-documento-base/entities/tipo-documento-base.entity';
import { TipoDocumentoCampo } from './tipo-documento-campo.entity';

/** Tabela "TiposDocumento": catálogo livre por edital/cota (REQ-1.4). */
@Entity('TiposDocumento')
export class TipoDocumento {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'bigint', transformer: numericTransformer })
  id_edital: number;

  /** W8: NULL = extra do edital; set = herdado de TiposDocumentoBase. */
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_tipo_base?: number | null;

  @Column({ length: 255 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string | null;

  @Column({ type: 'boolean', default: true })
  obrigatorio: boolean;

  @Column({ type: 'text', array: true, default: () => "ARRAY['pdf']::text[]" })
  formatos: string[];

  @Column({ type: 'int', default: 15 * 1024 * 1024 })
  tamanho_max_bytes: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  template_nome?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  template_mime?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  template_arquivo?: Buffer | null;

  @Column({
    type: 'enum',
    enum: FaseDocumento,
    enumName: PG_ENUM_NAMES.faseDocumento,
  })
  fase: FaseDocumento;

  /** NULL = edital-wide; set = only that cota (e.g. BAIXA_RENDA). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  tipo_cota?: string | null;

  @Column({ type: 'int' })
  ordem: number;

  @ManyToOne(() => Edital, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_edital' })
  edital?: Edital;

  @ManyToOne(() => TipoDocumentoBase, { nullable: true })
  @JoinColumn({ name: 'id_tipo_base' })
  tipoBase?: TipoDocumentoBase | null;

  @OneToMany(() => TipoDocumentoCampo, (campo) => campo.tipoDocumento)
  campos?: TipoDocumentoCampo[];
}
