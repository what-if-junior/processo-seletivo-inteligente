import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ChamadasService } from './chamadas.service';
import { cpfsDoArquivo } from './matriculados.util';

const MAX_MATRICULADOS_BYTES = 5 * 1024 * 1024;

const MatriculadosUploadInterceptor = FileInterceptor('arquivo', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_MATRICULADOS_BYTES },
});

@ApiTags('chamadas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('chamadas')
export class ChamadasController {
  constructor(private readonly service: ChamadasService) {}

  @Get()
  @ApiQuery({ name: 'id_oferta', type: Number })
  @ApiOperation({ summary: 'Lista as chamadas de uma oferta (REQ-3.4)' })
  findByOferta(@Query('id_oferta') idOferta?: string) {
    const id = Number(idOferta);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('id_oferta é obrigatório');
    }
    return this.service.findByOferta(id);
  }

  @Post('gerar')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id_oferta'],
      properties: {
        id_oferta: { type: 'number' },
        observacao: { type: 'string', nullable: true },
        fallback_ac_para_rv: {
          type: 'boolean',
          description: 'Sobrepõe o flag do edital só nesta chamada',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Gera a próxima chamada da oferta com listas regular e de espera (REQ-3.1 a 3.4)',
  })
  gerar(
    @Body()
    body: {
      id_oferta?: number | string;
      observacao?: string | null;
      fallback_ac_para_rv?: boolean;
    },
  ) {
    const idOferta = Number(body?.id_oferta);
    if (!Number.isFinite(idOferta) || idOferta <= 0) {
      throw new BadRequestException('id_oferta é obrigatório');
    }
    return this.service.gerar({
      id_oferta: idOferta,
      observacao: body?.observacao ?? null,
      fallback_ac_para_rv: body?.fallback_ac_para_rv,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha a chamada com vagas e classificação' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/matriculados')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cpfs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de CPFs; alternativa ao upload de ficheiro',
        },
        arquivo: {
          type: 'string',
          format: 'binary',
          description: 'CSV/TXT com um CPF por linha',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Importa os CPFs matriculados desta chamada (REQ-3.5)',
  })
  @UseInterceptors(MatriculadosUploadInterceptor)
  importarMatriculados(
    @Param('id', ParseIntPipe) id: number,
    @Body('cpfs') cpfs?: string[] | string,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    const doCorpo = Array.isArray(cpfs)
      ? cpfs
      : typeof cpfs === 'string' && cpfs.trim()
        ? cpfs.split(/[\s;,]+/)
        : [];
    const lista = [...doCorpo, ...cpfsDoArquivo(arquivo?.buffer)];
    return this.service.importarMatriculadosPorChamada(id, lista);
  }

  @Post(':id/notificar')
  @ApiOperation({
    summary: 'Notifica os convocados da chamada (stub: devolve o total)',
  })
  notificar(@Param('id', ParseIntPipe) id: number) {
    return this.service.notificar(id);
  }
}
