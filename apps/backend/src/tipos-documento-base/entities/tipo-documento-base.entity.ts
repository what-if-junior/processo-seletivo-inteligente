import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FaseDocumento, PG_ENUM_NAMES } from '@repo/types';
import { DocumentoConta } from './documento-conta.entity';

/** Tabela "TiposDocumentoBase": catálogo account-level herdado por novos editais (REQ-1.5). */
@Entity('TiposDocumentoBase')
export class TipoDocumentoBase {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

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
    default: FaseDocumento.INSCRICAO,
  })
  fase: FaseDocumento;

  @Column({ type: 'int' })
  ordem: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'criado_em' })
  criado_em: Date;

  @OneToMany(() => DocumentoConta, (d) => d.tipoBase)
  documentosConta?: DocumentoConta[];
}
