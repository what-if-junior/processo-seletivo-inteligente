import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCarrosselManualDto {
  @ApiProperty({ example: 'Inscrições abertas' })
  titulo: string;

  @ApiPropertyOptional({ example: 'Destaque' })
  rotulo?: string | null;

  @ApiPropertyOptional({ example: 'Vagas para cursos técnicos e superiores' })
  subtitulo?: string | null;

  @ApiPropertyOptional({ example: 'Ver editais' })
  cta_texto?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'Absolute https URL or null (prefer id_edital for filter CTA)',
  })
  cta_link?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'HTTPS image URL only',
  })
  imagem_url?: string | null;

  @ApiPropertyOptional({ example: 'GraduationCap' })
  icone?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Optional soft link for Home filter CTA',
  })
  id_edital?: number | null;

  @ApiPropertyOptional({ default: true })
  ativo?: boolean;

  @ApiPropertyOptional({
    example: null,
    description: 'Schedule start (null = always)',
  })
  inicio_em?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'Schedule end (null = always)',
  })
  fim_em?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Ordem; se omitido, append ao final',
  })
  ordem?: number;
}
