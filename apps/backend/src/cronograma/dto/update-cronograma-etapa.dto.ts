import { ApiPropertyOptional } from '@nestjs/swagger';
import { EtapaStatusOverride, TipoEtapaCronograma } from '@repo/types';

export class UpdateCronogramaEtapaDto {
  @ApiPropertyOptional({ enum: TipoEtapaCronograma })
  tipo?: TipoEtapaCronograma;

  @ApiPropertyOptional()
  nome_exibido?: string;

  @ApiPropertyOptional()
  data_inicio?: string;

  @ApiPropertyOptional()
  data_fim?: string;

  @ApiPropertyOptional({ nullable: true })
  descricao?: string | null;

  @ApiPropertyOptional()
  ordem?: number;

  @ApiPropertyOptional({ enum: EtapaStatusOverride })
  override?: EtapaStatusOverride;

  @ApiPropertyOptional()
  elegivel_impugnacao?: boolean;

  @ApiPropertyOptional()
  elegivel_recurso?: boolean;

  @ApiPropertyOptional({ nullable: true })
  template_instrucao_id?: number | null;
}
