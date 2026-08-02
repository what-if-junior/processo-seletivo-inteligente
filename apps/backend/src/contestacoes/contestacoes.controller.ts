import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { TipoContestacao } from '@repo/types';
import { Public } from '../auth/decorators/public.decorator';
import { ContestacoesService } from './contestacoes.service';
import {
  PatchContestacaoStatusDto,
  ResponderContestacaoDto,
} from './dto/create-contestacao.dto';
import { DOCUMENTO_UPLOAD_MAX_BYTES } from './contestacoes-validation.util';

type JwtUser = { sub: number; email?: string };
type UploadedBinary = {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype?: string;
};

@ApiTags('contestacoes')
@Controller('contestacoes')
export class ContestacoesController {
  constructor(private readonly contestacoesService: ContestacoesService) {}

  private userId(req: Request): number | undefined {
    const user = req.user as JwtUser | undefined;
    const id = Number(user?.sub);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  @Public()
  @Get('elegibilidade')
  @ApiOperation({ summary: 'Flags de impugnação/recurso + instrução (W29)' })
  elegibilidade(@Query('edital') edital?: string) {
    const id = Number(edital);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('edital é obrigatório');
    }
    return this.contestacoesService.elegibilidade(id);
  }

  @Public()
  @Post('impugnacao')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENTO_UPLOAD_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Impugnação pública sem JWT (REQ-5.1)' })
  createImpugnacao(
    @UploadedFile() file: UploadedBinary | undefined,
    @Body() body: Record<string, string>,
  ) {
    const id_edital = Number(body.id_edital);
    if (!Number.isFinite(id_edital) || id_edital <= 0) {
      throw new BadRequestException('id_edital é obrigatório');
    }
    return this.contestacoesService.createImpugnacao({
      id_edital,
      texto: body.texto ?? '',
      nome_requerente: body.nome_requerente ?? '',
      email_requerente: body.email_requerente ?? '',
      anexo: file?.buffer?.length
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        : null,
    });
  }

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: DOCUMENTO_UPLOAD_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Recurso / justificativa (JWT candidato)' })
  create(
    @Req() req: Request,
    @UploadedFile() file: UploadedBinary | undefined,
    @Body() body: Record<string, string>,
  ) {
    const uid = this.userId(req);
    if (!uid) throw new BadRequestException('JWT inválido');
    const tipo = body.tipo as TipoContestacao;
    const id_candidatura = Number(body.id_candidatura);
    if (!Number.isFinite(id_candidatura) || id_candidatura <= 0) {
      throw new BadRequestException('id_candidatura é obrigatório');
    }
    return this.contestacoesService.createCandidato({
      id_usuario: uid,
      tipo,
      id_candidatura,
      texto: body.texto ?? '',
      anexo: file?.buffer?.length
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        : null,
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Contestações do candidato autenticado' })
  listMe(@Req() req: Request) {
    const uid = this.userId(req);
    if (!uid) throw new BadRequestException('JWT inválido');
    return this.contestacoesService.listMe(uid);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listagem admin (filtros edital/tipo/status)' })
  listAdmin(
    @Query('edital') edital?: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
  ) {
    return this.contestacoesService.listAdmin({
      edital: edital ? Number(edital) : undefined,
      tipo,
      status,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe + histórico' })
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const uid = this.userId(req);
    if (!uid) throw new BadRequestException('JWT inválido');
    // W35 role gate deferred — treat JWT as allowed admin OR owner check inside
    return this.contestacoesService.findOne(id, {
      id_usuario: uid,
      isAdmin: true,
    });
  }

  @Get(':id/anexo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download do anexo' })
  async getAnexo(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const uid = this.userId(req);
    if (!uid) throw new BadRequestException('JWT inválido');
    const file = await this.contestacoesService.getAnexo(id, {
      id_usuario: uid,
      isAdmin: true,
    });
    return new StreamableFile(file.buffer, {
      type: file.mime,
      disposition: `attachment; filename="${file.nome.replace(/"/g, '')}"`,
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar status (gestor)' })
  patchStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchContestacaoStatusDto,
  ) {
    return this.contestacoesService.patchStatus(id, dto.status);
  }

  @Post(':id/responder')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resposta individual com histórico (W30; sem lote)',
  })
  responder(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderContestacaoDto,
  ) {
    const uid = this.userId(req);
    if (!uid) throw new BadRequestException('JWT inválido');
    return this.contestacoesService.responder(id, {
      id_usuario_gestor: uid,
      corpo: dto.corpo,
      canais: dto.canais,
      id_template_edital: dto.id_template_edital,
      status: dto.status,
    });
  }
}
