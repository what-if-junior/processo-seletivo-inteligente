import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecursosService } from './recursos.service';

@ApiTags('recursos')
@Controller('recursos')
export class RecursosController {
  constructor(private readonly recursosService: RecursosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista recursos, opcionalmente de uma etapa' })
  findAll(@Query('etapa') etapa?: string) {
    if (etapa) {
      return this.recursosService.findByEtapa(Number(etapa));
    }
    return this.recursosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um recurso com etapa e gestor' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recursosService.findOne(id);
  }
}
