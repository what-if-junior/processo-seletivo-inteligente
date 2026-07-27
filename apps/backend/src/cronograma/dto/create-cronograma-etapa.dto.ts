import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EtapaStatusOverride, TipoEtapaCronograma } from '@repo/types';

export class CreateCronogramaEtapaDto {
  @ApiProperty({ enum: TipoEtapaCronograma, example: TipoEtapaCronograma.INSCRICAO })
  tipo: TipoEtapaCronograma;

  @ApiPropertyOptional({
    example: 'Período de Inscrições',
    description: 'Se omitido, usa rótulo padrão do tipo',
  })
  nome_exibido?: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  data_inicio: string;

  @ApiProperty({ example: '2026-01-31T23:59:59.000Z' })
  data_fim: string;

  @ApiPropertyOptional({ description: 'Texto com links inline opcionais' })
  descricao?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Ordem; se omitido, append ao final',
  })
  ordem?: number;

  @ApiPropertyOptional({
    enum: EtapaStatusOverride,
    default: EtapaStatusOverride.AUTOMATICO,
  })
  override?: EtapaStatusOverride;

  @ApiPropertyOptional({ default: false })
  elegivel_impugnacao?: boolean;

  @ApiPropertyOptional({ default: false })
  elegivel_recurso?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'FK opcional para TemplatesEdital',
  })
  template_instrucao_id?: number | null;
}
