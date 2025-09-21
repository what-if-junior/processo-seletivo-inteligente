import { Endereco } from './address';

export interface User {
  id: string;
  email: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  idade?: number;
  telefone: string;
  endereco: Endereco;
}
