import {
  Body,
  Controller,
  Post,
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
import { memoryStorage } from 'multer';
import { LotesService } from './lotes.service';
import { LOTE_ENCODINGS } from './lote-parse.util';

/** Planilhas de secretaria são pequenas; 15 MiB cobre folgadamente um campus. */
const MAX_LOTE_BYTES = 15 * 1024 * 1024;

const uploadSchema = {
  type: 'object',
  required: ['arquivo'],
  properties: {
    arquivo: {
      type: 'string',
      format: 'binary',
      description: 'CSV ou XLSX exportado pela secretaria',
    },
    encoding: {
      type: 'string',
      enum: [...LOTE_ENCODINGS],
      default: 'utf-8',
    },
    columnMap: {
      type: 'string',
      description: 'JSON campo canónico → cabeçalho, ex.: {"cpf":"CPF do aluno"}',
    },
  },
};

const LoteUploadInterceptor = FileInterceptor('arquivo', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_LOTE_BYTES },
});

@ApiTags('lotes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('lotes')
export class LotesController {
  constructor(private readonly service: LotesService) {}

  @Post('contas/dry-run')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: uploadSchema })
  @ApiOperation({
    summary: 'Pré-valida o lote de contas sem gravar nada (REQ-2.8)',
  })
  @UseInterceptors(LoteUploadInterceptor)
  dryRunContas(
    @UploadedFile() arquivo?: Express.Multer.File,
    @Body('encoding') encoding?: string,
    @Body('columnMap') columnMap?: string,
  ) {
    return this.service.dryRunContas(arquivo, { encoding, columnMap });
  }

  @Post('contas/commit')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: uploadSchema })
  @ApiOperation({
    summary: 'Cria as contas válidas do lote; linhas com erro são ignoradas',
  })
  @UseInterceptors(LoteUploadInterceptor)
  commitContas(
    @UploadedFile() arquivo?: Express.Multer.File,
    @Body('encoding') encoding?: string,
    @Body('columnMap') columnMap?: string,
  ) {
    return this.service.commitContas(arquivo, { encoding, columnMap });
  }

  @Post('inscricoes/dry-run')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: uploadSchema })
  @ApiOperation({
    summary:
      'Pré-valida o lote de inscrições; duplicidade SiSU sai como aviso (REQ-2.2)',
  })
  @UseInterceptors(LoteUploadInterceptor)
  dryRunInscricoes(
    @UploadedFile() arquivo?: Express.Multer.File,
    @Body('encoding') encoding?: string,
    @Body('columnMap') columnMap?: string,
  ) {
    return this.service.dryRunInscricoes(arquivo, { encoding, columnMap });
  }

  @Post('inscricoes/commit')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: uploadSchema })
  @ApiOperation({
    summary: 'Cria as candidaturas válidas do lote (SiSU não passa pela unicidade)',
  })
  @UseInterceptors(LoteUploadInterceptor)
  commitInscricoes(
    @UploadedFile() arquivo?: Express.Multer.File,
    @Body('encoding') encoding?: string,
    @Body('columnMap') columnMap?: string,
  ) {
    return this.service.commitInscricoes(arquivo, { encoding, columnMap });
  }
}
