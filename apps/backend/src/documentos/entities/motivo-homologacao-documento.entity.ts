import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('MotivosHomologacaoDocumento')
export class MotivoHomologacaoDocumento {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 64, unique: true })
  codigo: string;

  @Column({ length: 255 })
  descricao: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'boolean', default: false })
  exige_texto_livre: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;
}
