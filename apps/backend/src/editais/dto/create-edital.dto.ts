import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoSelecao, MeritoTipo, TermosModo } from '@repo/types';

export class CreateEditalDto {
  @ApiProperty({ example: '001/2026', description: 'Número/ano do processo' })
  numero_ano: string;

  @ApiProperty({
    enum: MetodoSelecao,
    example: MetodoSelecao.ALEATORIO,
  })
  metodo_selecao: MetodoSelecao;

  @ApiPropertyOptional({
    enum: MeritoTipo,
    nullable: true,
    description: 'Obrigatório se MERITO ou 2ª etapa HIBRIDO',
  })
  merito_tipo?: MeritoTipo | null;

  @ApiPropertyOptional({ example: false })
  is_simplificado?: boolean;

  @ApiPropertyOptional({ example: false })
  fallback_ac_para_rv?: boolean;

  @ApiProperty({
    enum: TermosModo,
    example: TermosModo.URL,
    description:
      'Exatamente um modo: PDF (referência em termos_valor), URL ou TEXTO (rico)',
  })
  termos_modo: TermosModo;

  @ApiProperty({
    example: 'https://www.ifb.edu.br/editais/001-2026/termos.pdf',
    description:
      'Conteúdo do modo escolhido: path/ref (PDF), URL http(s), ou texto rico',
  })
  termos_valor: string;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
    description: 'Link da publicação oficial — opcional; pode ser editado depois',
  })
  link_oficial?: string | null;

  @ApiPropertyOptional({
    example: false,
    description:
      'Publicar exige termos válidos + ao menos um PDF de edital (histórico)',
  })
  publicado?: boolean;

  @ApiPropertyOptional({ example: false })
  inscricoes_abertas?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    nullable: true,
    description:
      'W8/REQ-1.5: ids de TiposDocumentoBase a herdar. Omitir = todos ativos; [] = nenhum; lista = só esses (desmarcáveis).',
    example: [1, 2],
  })
  tipos_base_ids?: number[] | null;
}
