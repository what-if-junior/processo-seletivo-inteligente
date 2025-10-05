import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Etnia } from '@repo/types';
import { Endereco } from './endereco.entity';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id_usuario: string;

  @Column()
  nome_completo: string;

  @Column({ unique: true })
  email: string;

  @Column()
  senha: string;

  @Column({ nullable: true })
  CPF?: string;

  @Column({ type: 'date', nullable: true })
  data_nascimento?: Date;

  @Column({ nullable: true })
  telefone?: string;

  // Você pode salvar os arquivos como string (ex: caminho no S3, base64, etc.)
  @Column({ nullable: true })
  RG?: string;

  @Column({ nullable: true })
  historico_escolar?: string;

  @Column({ type: 'float', nullable: true })
  renda_familiar?: number;

  @Column({ nullable: true })
  foto?: string;

  @Column({ type: 'enum', enum: Etnia, nullable: true })
  etnia?: Etnia;

  @Column({ type: 'boolean', default: false })
  pcd?: boolean;

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;

  @OneToOne(() => Endereco, endereco => endereco.usuario, { cascade: true, eager: true })
  @JoinColumn({ name: 'id_endereco' })
  endereco?: Endereco;
}