import { Etnia } from '@repo/types';

export class CreateEnderecoDto {
  estado: string;
  cidade: string;
  CEP: string;
  logradouro: string;
  bairro: string;
  numero_residencia: string;
  complemento?: string;
}

export class CreateUserDto {
  readonly nome_completo: string;
  readonly email: string;
  readonly senha: string;
  readonly CPF: string;
  /** Formato YYYY-MM-DD. */
  readonly data_nascimento: string;
  readonly telefone: string;
  readonly nome_RG?: string;
  readonly nome_historico_escolar?: string;
  readonly renda_familiar?: number;
  readonly foto_alt?: string;
  readonly ppi?: Etnia;
  readonly pcd?: boolean;
  readonly endereco?: CreateEnderecoDto;
}
