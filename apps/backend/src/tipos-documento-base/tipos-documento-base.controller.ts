import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
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
import { BACKEND_UPLOAD_MAX_BYTES } from '@repo/types';
import { TiposDocumentoBaseService } from './tipos-documento-base.service';
import { CreateTipoDocumentoBaseDto } from './dto/create-tipo-documento-base.dto';
import { UpdateTipoDocumentoBaseDto } from './dto/update-tipo-documento-base.dto';

@ApiTags('tipos-documento-base')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('tipos-documento-base')
export class TiposDocumentoBaseController {
  constructor(private readonly service: TiposDocumentoBaseService) {}

  @Get('gestao')
  @ApiOperation({
    summary:
      'Lista tipos base da conta (JWT). Inclui vinculados_count (REQ-1.5).',
  })
  findGestao() {
    return this.service.findAllGestao();
  }

  @Get('gestao/:id')
  @ApiOperation({ summary: 'Detalhe de tipo base + vinculados_count (JWT)' })
  findOneGestao(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneGestao(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria tipo base da conta (JWT)' })
  create(@Body() dto: CreateTipoDocumentoBaseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza tipo base da conta (JWT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoDocumentoBaseDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Remove tipo base (JWT). 409 se vinculado a editais ou DocumentosConta.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/template')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo'],
      properties: {
        arquivo: {
          type: 'string',
          format: 'binary',
          description: 'Template (docx/pdf/…); ≤ 15 MiB',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Envia template do tipo base (JWT)' })
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: BACKEND_UPLOAD_MAX_BYTES },
    }),
  )
  uploadTemplate(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.uploadTemplate(id, file);
  }

  @Get(':id/template')
  @ApiOperation({ summary: 'Baixa template do tipo base (JWT)' })
  async downloadTemplate(@Param('id', ParseIntPipe) id: number) {
    const { file } = await this.service.downloadTemplate(id);
    return file;
  }
}
