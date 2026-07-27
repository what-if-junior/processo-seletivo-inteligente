import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  Req,
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
import { BACKEND_UPLOAD_MAX_BYTES } from '@repo/types';
import { DocumentosContaService } from './documentos-conta.service';

type JwtUser = { sub: number; email?: string };

@ApiTags('documentos-conta')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('me/documentos-conta')
export class DocumentosContaController {
  constructor(private readonly service: DocumentosContaService) {}

  private userId(req: Request): number {
    const user = req.user as JwtUser | undefined;
    return Number(user?.sub);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista ficheiros atuais de Meus Dados do utilizador autenticado (JWT)',
  })
  list(@Req() req: Request) {
    return this.service.listForUser(this.userId(req));
  }

  @Put(':tipoBaseId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo'],
      properties: {
        arquivo: {
          type: 'string',
          format: 'binary',
          description: 'Ficheiro atual do tipo (um por tipo; substitui)',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Envia/substitui ficheiro atual do tipo base em Meus Dados (JWT)',
  })
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: BACKEND_UPLOAD_MAX_BYTES },
    }),
  )
  upsert(
    @Req() req: Request,
    @Param('tipoBaseId', ParseIntPipe) tipoBaseId: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.upsert(this.userId(req), tipoBaseId, file);
  }

  @Get(':tipoBaseId/arquivo')
  @ApiOperation({ summary: 'Baixa ficheiro atual do tipo em Meus Dados (JWT)' })
  async download(
    @Req() req: Request,
    @Param('tipoBaseId', ParseIntPipe) tipoBaseId: number,
  ) {
    const { file } = await this.service.download(this.userId(req), tipoBaseId);
    return file;
  }

  @Delete(':tipoBaseId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove ficheiro atual do tipo em Meus Dados (JWT)' })
  remove(
    @Req() req: Request,
    @Param('tipoBaseId', ParseIntPipe) tipoBaseId: number,
  ) {
    return this.service.remove(this.userId(req), tipoBaseId);
  }
}
