import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateHubFaqDto {
  @IsString()
  @MaxLength(500)
  pergunta!: string;

  @IsString()
  resposta!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateHubFaqDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pergunta?: string;

  @IsOptional()
  @IsString()
  resposta?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CreateHubContactoDto {
  @IsString()
  @MaxLength(255)
  titulo!: string;

  @IsString()
  @MaxLength(500)
  valor!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateHubContactoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  valor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateHubLgpdDto {
  @IsOptional()
  @IsString()
  texto_lgpd?: string | null;
}

export class ReorderHubDto {
  @IsInt({ each: true })
  ids!: number[];
}
