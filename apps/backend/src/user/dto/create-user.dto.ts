import { Endereco } from '@repo/types';
import { Etnia } from '@repo/types';

export class CreateUserDto {
  readonly nome_completo: string;
  readonly email: string;
  readonly CPF: string;
  readonly data_nascimento: Date;
  readonly telefone: string;
  readonly RG: File;
  readonly historico_escolar: File;
  readonly renda_familiar: number;
  readonly foto: File;
  readonly etnia: Etnia;
  readonly pcd: boolean;
  readonly endereco: Endereco;
}