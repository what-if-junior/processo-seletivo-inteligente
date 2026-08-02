import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { FaseDocumento } from '@repo/types';
import { DocumentosService } from './documentos.service';
import {
  DecidirDocumentoDto,
  DecidirLoteDto,
} from './dto/decidir-documento.dto';
import { DOCUMENTO_UPLOAD_MAX_BYTES } from './documentos-validation.util';

type JwtUser = { sub: number; email?: string };
type UploadedBinary = {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype?: string;
};

@ApiTags('documentos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  private userId(req: Request): number | undefined {
    const user = req.user as JwtUser | undefined;
    const id = Number(user?.sub);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  @Get('motivos')
  @ApiOperation({
    summary: 'Catálogo de motivos de homologação/rejeição (W27)',
  })
  listMotivos(@Query('todos') todos?: string) {
    return this.documentosService.listMotivos(todos !== '1');
  }

  @Get('fila')
  @ApiOperation({
    summary:
      'Fila de homologação humana (filtros edital/status/fase); default em_analise',
  })
  listFila(
    @Query('edital') edital?: string,
    @Query('status') status?: string,
    @Query('fase') fase?: string,
  ) {
    return this.documentosService.listFila({
      edital: edital ? Number(edital) : undefined,
      status: status || undefined,
      fase: fase || undefined,
    });
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista documentos, opcionalmente de uma candidatura (requer JWT)',
  })
  findAll(@Query('candidatura') candidatura?: string) {
    if (candidatura) {
      return this.documentosService.findByCandidatura(Number(candidatura));
    }
    return this.documentosService.findAll();
  }

  @Get(':id/arquivo')
  @ApiOperation({ summary: 'Download/preview do binário do documento' })
  @Header('Cache-Control', 'private, no-store')
  async downloadArquivo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const { file } = await this.documentosService.downloadArquivo(id);
    return file;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalha um documento sem o binário (requer JWT)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentosService.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENTO_UPLOAD_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo', 'id_candidatura', 'tipo_documento'],
      properties: {
        arquivo: { type: 'string', format: 'binary' },
        id_candidatura: { type: 'integer' },
        tipo_documento: { type: 'string' },
        fase: { type: 'string', enum: Object.values(FaseDocumento) },
      },
    },
  })
  @ApiOperation({
    summary:
      'Upload multipart (cria ou substitui por tipo×fase se já existir)',
  })
  create(
    @Req() req: Request,
    @UploadedFile() file: UploadedBinary | undefined,
    @Body('id_candidatura') idCandidaturaRaw: string,
    @Body('tipo_documento') tipoDocumento: string,
    @Body('fase') fase?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('arquivo é obrigatório');
    }
    return this.documentosService.create({
      id_candidatura: Number(idCandidaturaRaw),
      tipo_documento: tipoDocumento,
      nome_arquivo: file.originalname || 'upload.bin',
      arquivo: file.buffer,
      mime: file.mimetype,
      fase,
      id_usuario: this.userId(req),
    });
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENTO_UPLOAD_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Substitui documento enquanto etapa aberta e não homologado (auditoria)',
  })
  replace(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedBinary | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('arquivo é obrigatório');
    }
    return this.documentosService.replace(id, {
      nome_arquivo: file.originalname || 'upload.bin',
      arquivo: file.buffer,
      mime: file.mimetype,
      id_usuario: this.userId(req),
    });
  }

  @Patch(':id/decidir')
  @ApiOperation({
    summary: 'Homologar ou rejeitar com motivo de catálogo (humano)',
  })
  decidir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecidirDocumentoDto,
  ) {
    return this.documentosService.decidir(id, dto);
  }

  @Post('decidir-lote')
  @ApiOperation({ summary: 'Decisão em lote (homologar/rejeitar)' })
  decidirLote(@Body() dto: DecidirLoteDto) {
    return this.documentosService.decidirLote(dto.ids ?? [], dto);
  }
}
