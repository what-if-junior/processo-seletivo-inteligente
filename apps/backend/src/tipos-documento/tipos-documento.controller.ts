import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Body,
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
import { Public } from '../auth/decorators/public.decorator';
import { TiposDocumentoService } from './tipos-documento.service';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';
import { ReplaceTipoDocumentoCamposDto } from './dto/replace-campos.dto';

@ApiTags('tipos-documento')
@Controller('editais/:editalId/tipos-documento')
export class TiposDocumentoController {
  constructor(private readonly tiposDocumentoService: TiposDocumentoService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista tipos de documento de edital publicado. Rascunhos: GET .../gestao',
  })
  findAllPublic(@Param('editalId', ParseIntPipe) editalId: number) {
    return this.tiposDocumentoService.findAllPublic(editalId);
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista tipos inclusive de edital rascunho (JWT)',
  })
  findAllGestao(@Param('editalId', ParseIntPipe) editalId: number) {
    return this.tiposDocumentoService.findAllGestao(editalId);
  }

  @Get('gestao/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Detalhe de tipo com campos e warnings (JWT)' })
  findOneGestao(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tiposDocumentoService.findOneGestao(editalId, id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Cria tipo de documento no edital (JWT)' })
  create(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Body() dto: CreateTipoDocumentoDto,
  ) {
    return this.tiposDocumentoService.create(editalId, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de tipo (público se edital publicado)',
  })
  findOnePublic(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tiposDocumentoService.findOnePublic(editalId, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Atualiza tipo (JWT). Soft warning se já houver inscrições no edital.',
  })
  update(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoDocumentoDto,
  ) {
    return this.tiposDocumentoService.update(editalId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Remove tipo (JWT). Retorna payload + warnings do catálogo.',
  })
  remove(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tiposDocumentoService.remove(editalId, id);
  }

  @Put(':id/campos')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Substitui campos do builder do tipo (JWT, transactional)',
  })
  replaceCampos(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceTipoDocumentoCamposDto,
  ) {
    return this.tiposDocumentoService.replaceCampos(editalId, id, dto);
  }

  @Post(':id/template')
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
          description: 'Template (docx/pdf/…); ≤ 15 MiB',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Envia template do tipo de documento (JWT)' })
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: BACKEND_UPLOAD_MAX_BYTES },
    }),
  )
  uploadTemplate(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tiposDocumentoService.uploadTemplate(editalId, id, file);
  }

  @Get(':id/template')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Baixa template do tipo (JWT)' })
  async downloadTemplate(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { file } = await this.tiposDocumentoService.downloadTemplate(
      editalId,
      id,
    );
    return file;
  }
}
