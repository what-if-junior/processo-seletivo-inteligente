import { TipoIngresso, TipoVagaCandidatura } from '@repo/types';

export class CreateCandidaturaDto {
  id_usuario: number;
  id_oferta: number;
  id_edital: number;
  /** Formato YYYY-MM-DD. Assume a data atual quando ausente. */
  data_inscricao?: string;
  tipo_ingresso?: TipoIngresso;
  tipo_vaga?: TipoVagaCandidatura;
}
