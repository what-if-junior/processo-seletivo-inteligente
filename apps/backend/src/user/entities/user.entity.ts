import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etnia } from '@repo/types';
import { Endereco } from './endereco.entity';
import { Candidatura } from '../../candidaturas/entities/candidatura.entity';
import { Gestor } from '../../gestores/entities/gestor.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Usuarios')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  nome_completo: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255, select: false })
  senha: string;

  @Column({ length: 255 })
  CPF: string;

  @Column({ type: 'date' })
  data_nascimento: string;

  @Column({ length: 255 })
  telefone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_RG?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  RG?: Buffer | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_historico_escolar?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  historico_escolar?: Buffer | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  renda_familiar?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  foto_alt?: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  foto?: Buffer | null;

  /** Coluna "ppi" (VARCHAR) guarda a autodeclaracao etnica. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  ppi?: Etnia | null;

  @Column({ type: 'boolean', default: false })
  pcd: boolean;

  /** REQ-2.8: inativo bloqueia o login mas mantem as inscricoes. */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  token?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;

  @OneToMany(() => Endereco, (endereco) => endereco.usuario, {
    cascade: ['insert', 'update'],
  })
  enderecos?: Endereco[];

  @OneToMany(() => Candidatura, (candidatura) => candidatura.usuario)
  candidaturas?: Candidatura[];

  @OneToMany(() => Gestor, (gestor) => gestor.usuario)
  gestores?: Gestor[];
}
