import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CampoFormularioTipo, PG_ENUM_NAMES } from '@repo/types';
import { numericTransformer } from '../../common/transformers';
import { TipoDocumento } from './tipo-documento.entity';

/** Tabela "TipoDocumentoCampos": builder texto|numero|documento (REQ-1.4). */
@Entity('TipoDocumentoCampos')
export class TipoDocumentoCampo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_tipo_documento: number;

  @Column({
    type: 'enum',
    enum: CampoFormularioTipo,
    enumName: PG_ENUM_NAMES.campoFormularioTipo,
  })
  tipo: CampoFormularioTipo;

  @Column({ length: 255 })
  rotulo: string;

  @Column({ type: 'boolean', default: false })
  obrigatorio: boolean;

  @Column({ type: 'int' })
  ordem: number;

  @Column({ type: 'text', array: true, nullable: true })
  formatos?: string[] | null;

  @Column({ type: 'int', nullable: true })
  tamanho_max_bytes?: number | null;

  @ManyToOne(() => TipoDocumento, (tipo) => tipo.campos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_tipo_documento' })
  tipoDocumento?: TipoDocumento;
}
