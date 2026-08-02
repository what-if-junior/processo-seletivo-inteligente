import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contestacao } from './contestacao.entity';
import { Gestor } from '../../gestores/entities/gestor.entity';
import { TemplateEdital } from '../../templates/entities/template-edital.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('ContestacaoHistorico')
export class ContestacaoHistorico {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'bigint',
    transformer: numericTransformer,
  })
  id_contestacao: number;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_gestor?: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: numericTransformer,
  })
  id_template_edital?: number | null;

  @Column({ length: 50 })
  canal: string;

  @Column({ type: 'text' })
  corpo: string;

  @CreateDateColumn({ name: 'enviado_em', type: 'timestamp' })
  enviado_em: Date;

  @ManyToOne(() => Contestacao, (c) => c.historico, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_contestacao' })
  contestacao?: Contestacao;

  @ManyToOne(() => Gestor, { nullable: true })
  @JoinColumn({ name: 'id_gestor' })
  gestor?: Gestor | null;

  @ManyToOne(() => TemplateEdital, { nullable: true })
  @JoinColumn({ name: 'id_template_edital' })
  templateEdital?: TemplateEdital | null;
}
