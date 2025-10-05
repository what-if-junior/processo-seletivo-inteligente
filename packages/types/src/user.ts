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
  CPF: string;
  data_nascimento: Date;
  telefone: string;
  RG: File;
  historico_escolar: File;
  renda_familiar: number;
  foto: File;
  etnia: Etnia;
  pcd: boolean;
  criado_em: Date;
  atualizado_em: Date;
  endereco: Endereco;
}