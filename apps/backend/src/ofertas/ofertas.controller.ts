import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OfertasService } from './ofertas.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';
import { CotaItemDto } from './dto/cota-item.dto';
import { ReplaceCotasDto } from './dto/replace-cotas.dto';
import { UpdateCotaDto } from './dto/update-cota.dto';

@ApiTags('ofertas')
@Controller('ofertas')
export class OfertasController {
  constructor(private readonly ofertasService: OfertasService) {}

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Cria uma oferta (edital × curso × campus × turno) (requer JWT)',
  })
  create(@Body() dto: CreateOfertaDto) {
    return this.ofertasService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista ofertas de editais publicados (público). Rascunhos: GET /ofertas/gestao.',
  })
  @ApiQuery({ name: 'id_edital', required: false, type: Number })
  @ApiQuery({ name: 'id_curso', required: false, type: Number })
  @ApiQuery({ name: 'id_campus', required: false, type: Number })
  @ApiQuery({
    name: 'abertas',
    required: false,
    type: Boolean,
    description: 'Só ofertas de editais publicados com inscricoes_abertas',
  })
  findAllPublic(
    @Query('id_edital', new ParseIntPipe({ optional: true }))
    id_edital?: number,
    @Query('id_curso', new ParseIntPipe({ optional: true }))
    id_curso?: number,
    @Query('id_campus', new ParseIntPipe({ optional: true }))
    id_campus?: number,
    @Query('abertas', new ParseBoolPipe({ optional: true }))
    abertas?: boolean,
  ) {
    return this.ofertasService.findAllPublic({
      id_edital,
      id_curso,
      id_campus,
      abertas,
    });
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista todas as ofertas inclusive de rascunhos (JWT)',
  })
  @ApiQuery({ name: 'id_edital', required: false, type: Number })
  @ApiQuery({ name: 'id_curso', required: false, type: Number })
  @ApiQuery({ name: 'id_campus', required: false, type: Number })
  @ApiQuery({
    name: 'abertas',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'publicados',
    required: false,
    type: Boolean,
  })
  findAllGestao(
    @Query('id_edital', new ParseIntPipe({ optional: true }))
    id_edital?: number,
    @Query('id_curso', new ParseIntPipe({ optional: true }))
    id_curso?: number,
    @Query('id_campus', new ParseIntPipe({ optional: true }))
    id_campus?: number,
    @Query('abertas', new ParseBoolPipe({ optional: true }))
    abertas?: boolean,
    @Query('publicados', new ParseBoolPipe({ optional: true }))
    publicados?: boolean,
  ) {
    return this.ofertasService.findAll({
      id_edital,
      id_curso,
      id_campus,
      abertas,
      publicados,
    });
  }

  @Get('gestao/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Detalha oferta (inclui rascunho) com cotas e warnings de fechamento (JWT)',
  })
  findOneGestao(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findOneWithWarnings(id);
  }

  @Get(':id/candidaturas')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista candidaturas de uma oferta (requer JWT)',
  })
  findCandidaturas(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findCandidaturas(id);
  }

  @Put(':id/cotas')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Substitui distribuição de cotas da oferta (JWT). Warning se soma ≠ vagas_totais.',
  })
  replaceCotas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceCotasDto,
  ) {
    return this.ofertasService.replaceCotas(id, dto);
  }

  @Post(':id/cotas')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Adiciona uma cota à oferta (JWT)' })
  addCota(@Param('id', ParseIntPipe) id: number, @Body() dto: CotaItemDto) {
    return this.ofertasService.addCota(id, dto);
  }

  @Patch(':id/cotas/:cotaId')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza uma cota da oferta (JWT)' })
  updateCota(
    @Param('id', ParseIntPipe) id: number,
    @Param('cotaId', ParseIntPipe) cotaId: number,
    @Body() dto: UpdateCotaDto,
  ) {
    return this.ofertasService.updateCota(id, cotaId, dto);
  }

  @Delete(':id/cotas/:cotaId')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove uma cota da oferta (JWT)' })
  removeCota(
    @Param('id', ParseIntPipe) id: number,
    @Param('cotaId', ParseIntPipe) cotaId: number,
  ) {
    return this.ofertasService.removeCota(id, cotaId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary:
      'Detalha oferta publicada com cotas (público). Rascunhos → 404 — use /gestao/:id.',
  })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findOnePublic(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza uma oferta (requer JWT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOfertaDto,
  ) {
    return this.ofertasService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove uma oferta (requer JWT)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.remove(id);
  }
}
