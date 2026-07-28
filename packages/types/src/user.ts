import { Endereco } from './address';

/** Valores aceitos pela coluna "ppi" da tabela "Usuarios". */
export enum Etnia {
  BRANCO = 'branco',
  PRETO = 'preto',
  INDIGENA = 'indigena',
  PARDO = 'pardo',
  AMARELO = 'amarelo'
}

/**
 * Usuario como a API o expoe: sem senha e sem os binarios (BYTEA) dos
 * documentos, que sao servidos por endpoints dedicados.
 */
export interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  CPF: string;
  data_nascimento: string;
  telefone: string;
  nome_RG?: string | null;
  nome_historico_escolar?: string | null;
  renda_familiar?: number | null;
  foto_alt?: string | null;
  ppi?: Etnia | null;
  pcd: boolean;
  /** REQ-2.8: inativo bloqueia o login mas mantem as inscricoes. */
  ativo: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
  enderecos?: Endereco[];
}
