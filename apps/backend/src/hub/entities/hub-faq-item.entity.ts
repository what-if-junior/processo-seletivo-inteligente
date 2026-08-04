import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('HubFaqItens')
export class HubFaqItem {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ length: 500 })
  pergunta: string;

  @Column({ type: 'text' })
  resposta: string;

  @Column({ type: 'int', default: 0 })
  ordem: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizado_em: Date;
}
