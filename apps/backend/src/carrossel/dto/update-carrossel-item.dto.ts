import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCarrosselItemDto {
  @ApiPropertyOptional()
  titulo?: string;

  @ApiPropertyOptional({ nullable: true })
  rotulo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  subtitulo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  cta_texto?: string | null;

  @ApiPropertyOptional({ nullable: true })
  cta_link?: string | null;

  @ApiPropertyOptional({ nullable: true })
  imagem_url?: string | null;

  @ApiPropertyOptional({ nullable: true })
  icone?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Only for manual items; ignored/forbidden for auto',
  })
  id_edital?: number | null;

  @ApiPropertyOptional()
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Primary toggle for auto_edital public visibility',
  })
  auto_edital_habilitado?: boolean;

  @ApiPropertyOptional({ nullable: true })
  inicio_em?: string | null;

  @ApiPropertyOptional({ nullable: true })
  fim_em?: string | null;

  @ApiPropertyOptional()
  ordem?: number;
}
