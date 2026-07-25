import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EtapasProcessoService } from './etapas-processo.service';

@ApiTags('etapas-processo')
@Controller('etapas-processo')
export class EtapasProcessoController {
  constructor(private readonly etapasProcessoService: EtapasProcessoService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista etapas do processo, opcionalmente de uma candidatura',
  })
  findAll(@Query('candidatura') candidatura?: string) {
    if (candidatura) {
      return this.etapasProcessoService.findByCandidatura(Number(candidatura));
    }
    return this.etapasProcessoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma etapa com candidatura, gestor e recursos' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.etapasProcessoService.findOne(id);
  }
}
