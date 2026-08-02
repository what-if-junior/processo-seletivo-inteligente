import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers';

@Entity('DocumentosAuditoria')
export class DocumentoAuditoria {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'int' })
  id_documento: number;

  @Column({ type: 'bigint', transformer: numericTransformer })
  id_candidatura: number;

  @Column({ length: 64 })
  acao: string;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_usuario?: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_gestor?: number | null;

  @Column({ type: 'text', nullable: true })
  detalhe?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;
}
