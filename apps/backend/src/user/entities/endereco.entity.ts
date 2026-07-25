import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { numericTransformer } from '../../common/transformers';

@Entity('Enderecos')
export class Endereco {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  /**
   * As chaves estrangeiras sao expostas apenas para leitura: quem escreve a
   * coluna e a relacao correspondente.
   */
  @Column({
    type: 'bigint',
    insert: false,
    update: false,
    transformer: numericTransformer,
  })
  id_usuario: number;

  @Column({ length: 255 })
  estado: string;

  @Column({ length: 255 })
  cidade: string;

  @Column({ length: 255 })
  CEP: string;

  @Column({ length: 255 })
  logradouro: string;

  @Column({ length: 255 })
  bairro: string;

  @Column({ length: 255 })
  numero_residencia: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  complemento?: string | null;

  @ManyToOne(() => User, (user) => user.enderecos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: User;
}
