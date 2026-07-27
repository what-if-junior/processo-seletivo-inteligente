import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';
import { User } from '../../user/entities/user.entity';
import { TipoDocumentoBase } from './tipo-documento-base.entity';

/** Tabela "DocumentosConta": ficheiro atual por tipo base em Meus Dados (REQ-1.5). */
@Entity('DocumentosConta')
export class DocumentoConta {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'bigint', transformer: numericTransformer })
  id_usuario: number;

  @Column({ type: 'bigint', transformer: numericTransformer })
  id_tipo_base: number;

  @Column({ length: 255 })
  nome_arquivo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mime?: string | null;

  @Column({ type: 'bytea', select: false })
  arquivo?: Buffer;

  @UpdateDateColumn({ type: 'timestamp', name: 'atualizado_em' })
  atualizado_em: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;

  @ManyToOne(() => TipoDocumentoBase)
  @JoinColumn({ name: 'id_tipo_base' })
  tipoBase?: TipoDocumentoBase;
}
