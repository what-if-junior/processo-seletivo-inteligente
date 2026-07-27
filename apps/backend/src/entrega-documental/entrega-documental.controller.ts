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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { EntregaDocumentalService } from './entrega-documental.service';
import { CreateEntregaDocumentalDto } from './dto/create-entrega-documental.dto';
import { UpdateEntregaDocumentalDto } from './dto/update-entrega-documental.dto';

@ApiTags('entrega-documental')
@Controller('editais/:editalId/entrega-documental')
export class EntregaDocumentalController {
  constructor(
    private readonly entregaDocumentalService: EntregaDocumentalService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista configurações de entrega de edital publicado. Rascunhos: GET .../gestao',
  })
  findAllPublic(@Param('editalId', ParseIntPipe) editalId: number) {
    return this.entregaDocumentalService.findAllPublic(editalId);
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista entregas inclusive de edital rascunho (JWT)',
  })
  findAllGestao(@Param('editalId', ParseIntPipe) editalId: number) {
    return this.entregaDocumentalService.findAllGestao(editalId);
  }

  @Get('gestao/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Detalhe de entrega com uploads_ocultos (JWT)',
  })
  findOneGestao(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.entregaDocumentalService.findOneGestao(editalId, id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Cria config de entrega no vínculo edital/campus/curso/etapa (JWT)',
  })
  create(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Body() dto: CreateEntregaDocumentalDto,
  ) {
    return this.entregaDocumentalService.create(editalId, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de entrega (público se edital publicado)',
  })
  findOnePublic(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.entregaDocumentalService.findOnePublic(editalId, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza configuração de entrega (JWT)' })
  update(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEntregaDocumentalDto,
  ) {
    return this.entregaDocumentalService.update(editalId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove configuração de entrega (JWT)' })
  remove(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.entregaDocumentalService.remove(editalId, id);
  }
}
