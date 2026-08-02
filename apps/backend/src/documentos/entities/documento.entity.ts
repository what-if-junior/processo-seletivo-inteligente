import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FaseDocumento, StatusDocumento } from '@repo/types';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { MotivoHomologacaoDocumento } from './motivo-homologacao-documento.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Documentos')
export class Documento {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
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

  @Column({ type: 'varchar', length: 255, nullable: true })
  mime?: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: FaseDocumento.INSCRICAO,
  })
  fase: FaseDocumento | string;

  @Column({ type: 'varchar', length: 255, default: StatusDocumento.EM_ANALISE })
  status_documento: StatusDocumento | string;

  @Column({ type: 'int', nullable: true })
  id_motivo?: number | null;

  @Column({ type: 'text', nullable: true })
  motivo_livre?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  decidido_em?: Date | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_gestor_decisao?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  anexo_decisao_nome?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  anexo_decisao?: Buffer | null;

  /** W28 suggestion only — never drives status alone (W27 invariant). */
  @Column({ type: 'text', nullable: true })
  sugestao_ia?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @ManyToOne(() => Candidatura, (candidatura) => candidatura.documentos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_candidatura' })
  candidatura?: Candidatura;

  @ManyToOne(() => MotivoHomologacaoDocumento, { nullable: true })
  @JoinColumn({ name: 'id_motivo' })
  motivo?: MotivoHomologacaoDocumento | null;
}
