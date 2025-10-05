import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('enderecos')
export class Endereco {
  @PrimaryGeneratedColumn('uuid')
  id_endereco: string;

  @Column()
  estado: string;

  @Column()
  cidade: string;

  @Column()
  CEP: string;

  @Column()
  logradouro: string;

  @Column()
  bairro: string;

  @Column()
  numero_residencia: string;

  @Column({ nullable: true })
  complemento?: string;

  @OneToOne(() => User, user => user.endereco)
  usuario: User;
}