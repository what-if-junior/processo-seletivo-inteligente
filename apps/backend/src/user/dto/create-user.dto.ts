import { Endereco } from '@repo/types';
import { Etnia } from '@repo/types';

export class CreateUserDto {
  readonly nome_completo: string;
  readonly email: string;
  readonly senha: string;
  readonly CPF: string;
  readonly data_nascimento: Date;
  readonly telefone: string;
  readonly RG: string;
  readonly historico_escolar: string;
  readonly renda_familiar: number;
  readonly foto: string;
  readonly etnia: Etnia;
  readonly pcd: boolean;
  readonly endereco: Endereco;
}