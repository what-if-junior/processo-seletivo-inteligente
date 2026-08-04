import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('HubContactos')
export class HubContacto {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ length: 500 })
  valor: string;

  /** email | telefone | url | endereco | outro */
  @Column({ length: 50, default: 'outro' })
  tipo: string;

  @Column({ type: 'int', default: 0 })
  ordem: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;
}
