import { Endereco } from './address';

export enum Etnia {
  BRANCO = 'branco',
  PRETO = 'preto',
  INDIGENA = 'indigena',
  PARDO = 'pardo',
  AMARELO = 'amarelo'
}

export interface Usuario {
  id_usuario: string;
  nome_completo: string;
  email: string;
  senha: string;
  CPF?: string;
  data_nascimento?: Date;
  telefone?: string;
  RG?: string;
  historico_escolar?: string;
  renda_familiar?: number;
  foto?: string;
  etnia?: Etnia;
  pcd?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
  endereco?: Endereco;
}