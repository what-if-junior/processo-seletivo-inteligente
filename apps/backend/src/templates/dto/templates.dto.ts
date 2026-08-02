import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateBibliotecaDto {
  @ApiProperty()
  titulo: string;

  @ApiProperty()
  corpo: string;

  @ApiPropertyOptional()
  canal?: string | null;

  @ApiPropertyOptional()
  tipo_uso?: string | null;

  @ApiPropertyOptional()
  ativo?: boolean;
}

export class UpdateTemplateBibliotecaDto {
  @ApiPropertyOptional()
  titulo?: string;

  @ApiPropertyOptional()
  corpo?: string;

  @ApiPropertyOptional()
  canal?: string | null;

  @ApiPropertyOptional()
  tipo_uso?: string | null;

  @ApiPropertyOptional()
  ativo?: boolean;
}

export class CopiarTemplateEditalDto {
  @ApiProperty()
  id_template_biblioteca: number;
}

export class UpdateTemplateEditalDto {
  @ApiPropertyOptional()
  titulo?: string;

  @ApiPropertyOptional()
  corpo?: string;

  @ApiPropertyOptional()
  canal?: string | null;

  @ApiPropertyOptional()
  tipo_uso?: string | null;
}
