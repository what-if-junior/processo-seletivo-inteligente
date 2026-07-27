import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { Public } from '../auth/decorators/public.decorator';
import { EditaisService } from './editais.service';
import { CreateEditalDto } from './dto/create-edital.dto';
import { UpdateEditalDto } from './dto/update-edital.dto';
import { EditalArquivoMetaDto } from './dto/edital-arquivo-meta.dto';

@ApiTags('editais')
@Controller('editais')
export class EditaisController {
  constructor(private readonly editaisService: EditaisService) {}

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Cria edital (JWT). Termos: exatamente um modo PDF|URL|TEXTO. Publicação só após upload de PDF.',
  })
  create(@Body() dto: CreateEditalDto, @Req() req: Request) {
    return this.editaisService.create(
      dto,
      req.body as Record<string, unknown>,
    );
  }

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista editais publicados (público). Rascunhos ficam ocultos — use GET /editais/gestao com JWT.',
  })
  @ApiQuery({
    name: 'inscricoes_abertas',
    required: false,
    type: Boolean,
    description: 'Filtra apenas com inscrições abertas (ainda publicados)',
  })
  findAllPublic(
    @Query('inscricoes_abertas', new ParseBoolPipe({ optional: true }))
    inscricoes_abertas?: boolean,
  ) {
    return this.editaisService.findAllPublic({ inscricoes_abertas });
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista todos os editais inclusive rascunhos (JWT)',
  })
  @ApiQuery({ name: 'publicado', required: false, type: Boolean })
  @ApiQuery({ name: 'inscricoes_abertas', required: false, type: Boolean })
  findAllGestao(
    @Query('publicado', new ParseBoolPipe({ optional: true }))
    publicado?: boolean,
    @Query('inscricoes_abertas', new ParseBoolPipe({ optional: true }))
    inscricoes_abertas?: boolean,
  ) {
    return this.editaisService.findAll({ publicado, inscricoes_abertas });
  }

  @Get('gestao/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Detalha edital (inclui rascunho) com ofertas (JWT)',
  })
  findOneGestao(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.findOne(id);
  }

  @Post(':id/arquivos')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo'],
      properties: {
        arquivo: {
          type: 'string',
          format: 'binary',
          description: 'PDF do edital; o último enviado torna-se vigente',
        },
      },
    },
  })
  @ApiOkResponse({ type: EditalArquivoMetaDto })
  @ApiOperation({
    summary:
      'Envia PDF do edital (JWT). Histórico retido; último inserido = vigente.',
  })
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadArquivo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.editaisService.uploadArquivo(id, file);
  }

  @Get(':id/arquivos')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOkResponse({ type: EditalArquivoMetaDto, isArray: true })
  @ApiOperation({
    summary:
      'Lista histórico de PDFs (metadados; JWT). Campo vigente no último.',
  })
  listArquivos(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.listArquivos(id);
  }

  @Public()
  @Get(':id/arquivos/vigente')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({
    summary:
      'Baixa PDF vigente (último inserido). Público só se o edital estiver publicado.',
  })
  async downloadVigente(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    await this.editaisService.findOnePublic(id);
    const { buffer, meta } = await this.editaisService.getVigenteArquivo(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="edital-${id}-vigente-${meta.id}.pdf"`,
    });
  }

  @Get(':id/arquivos/:arquivoId')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({
    summary: 'Baixa PDF específico do histórico (JWT)',
  })
  async downloadArquivo(
    @Param('id', ParseIntPipe) id: number,
    @Param('arquivoId', ParseIntPipe) arquivoId: number,
  ): Promise<StreamableFile> {
    const { buffer, meta } = await this.editaisService.getArquivoBuffer(
      id,
      arquivoId,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="edital-${id}-${meta.id}.pdf"`,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary:
      'Detalha edital publicado com ofertas (público). Rascunhos → 404.',
  })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.findOnePublic(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Atualiza edital (JWT). Link oficial opcional; publicar exige PDF + termos.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEditalDto,
    @Req() req: Request,
  ) {
    return this.editaisService.update(
      id,
      dto,
      req.body as Record<string, unknown>,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove um edital (requer JWT)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.remove(id);
  }
}
