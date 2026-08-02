import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoContestacao } from '@repo/types';

export class CreateContestacaoPublicaDto {
  @ApiProperty()
  id_edital: number;

  @ApiProperty()
  texto: string;

  @ApiProperty()
  nome_requerente: string;

  @ApiProperty()
  email_requerente: string;
}

export class CreateContestacaoCandidatoDto {
  @ApiProperty({ enum: [TipoContestacao.RECURSO, TipoContestacao.JUSTIFICATIVA] })
  tipo: TipoContestacao;

  @ApiProperty()
  id_candidatura: number;

  @ApiProperty()
  texto: string;
}

export class PatchContestacaoStatusDto {
  @ApiProperty({ enum: ['enviada', 'em_analise', 'deferida', 'indeferida'] })
  status: 'enviada' | 'em_analise' | 'deferida' | 'indeferida';
}

export class ResponderContestacaoDto {
  @ApiProperty()
  corpo: string;

  @ApiProperty({ type: [String], example: ['email', 'pwa'] })
  canais: string[];

  @ApiPropertyOptional()
  id_template_edital?: number;

  @ApiPropertyOptional({ enum: ['em_analise', 'deferida', 'indeferida'] })
  status?: 'em_analise' | 'deferida' | 'indeferida';
}
