import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoIngresso, TipoVagaCandidatura } from '@repo/types';
import { SocioeconomicoDto } from '../../socioeconomico/dto/socioeconomico.dto';

export class CreateCandidaturaDto {
  id_usuario: number;
  id_oferta: number;
  id_edital: number;
  /** Formato YYYY-MM-DD. Assume a data atual quando ausente. */
  data_inscricao?: string;
  tipo_ingresso?: TipoIngresso;
  tipo_vaga?: TipoVagaCandidatura;

  @ApiPropertyOptional({
    type: SocioeconomicoDto,
    description:
      'Obrigatório (faixa + nº pessoas) para BAIXA_RENDA quando há faixas ativas; omitido/incompleto sob regra B',
  })
  socioeconomico?: SocioeconomicoDto;
}
