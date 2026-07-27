import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
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
import { DocumentosService } from './documentos.service';

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

  @Get(':id')
  @ApiOperation({
    summary: 'Detalha um documento sem o binário (requer JWT)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentosService.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: 5 * 1024 * 1024 } }),
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
      },
    },
  })
  @ApiOperation({
    summary: 'Upload de documento (multipart) para uma candidatura',
  })
  create(
    @UploadedFile() file: UploadedBinary | undefined,
    @Body('id_candidatura') idCandidaturaRaw: string,
    @Body('tipo_documento') tipoDocumento: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('arquivo é obrigatório');
    }
    return this.documentosService.create({
      id_candidatura: Number(idCandidaturaRaw),
      tipo_documento: tipoDocumento,
      nome_arquivo: file.originalname || 'upload.bin',
      arquivo: file.buffer,
    });
  }
}
