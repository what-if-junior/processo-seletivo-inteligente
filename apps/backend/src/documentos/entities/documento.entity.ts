import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StatusDocumento } from '@repo/types';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Documentos')
export class Documento {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_candidatura: number;

  @Column({ length: 255 })
  tipo_documento: string;

  @Column({ length: 255 })
  nome_arquivo: string;

  /** Conteudo binario: fora do SELECT padrao para nao inflar as listagens. */
  @Column({ type: 'bytea', select: false })
  arquivo: Buffer;

  @Column({ type: 'varchar', length: 255, default: StatusDocumento.EM_ANALISE })
  status_documento: StatusDocumento | string;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @ManyToOne(() => Candidatura, (candidatura) => candidatura.documentos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_candidatura' })
  candidatura?: Candidatura;
}
