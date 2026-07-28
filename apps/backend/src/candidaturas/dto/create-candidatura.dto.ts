import { TipoIngresso, TipoVagaCandidatura } from '@repo/types';

export class CreateCandidaturaDto {
  id_usuario: number;
  id_oferta: number;
  id_edital: number;
  /** Formato YYYY-MM-DD. Assume a data atual quando ausente. */
  data_inscricao?: string;
  tipo_ingresso?: TipoIngresso;
  tipo_vaga?: TipoVagaCandidatura;

  /** REQ-2.4 — required when candidate is minor at submit date. */
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_aceite?: boolean;
  /** Base64 (optionally data-URL) of responsável document. */
  responsavel_documento_base64?: string;
  responsavel_documento_nome?: string;
}
