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
      'Lista ofertas com edital/curso/campus (público). Use abertas=true para catálogo de inscrição.',
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
  @ApiQuery({
    name: 'publicados',
    required: false,
    type: Boolean,
    description: 'Só ofertas de editais publicados (ignorado se abertas=true)',
  })
  findAll(
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

  @Get(':id/candidaturas')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista candidaturas de uma oferta (requer JWT)',
  })
  findCandidaturas(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findCandidaturas(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalha oferta com edital, curso, campus e cotas (público)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findOne(id);
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
