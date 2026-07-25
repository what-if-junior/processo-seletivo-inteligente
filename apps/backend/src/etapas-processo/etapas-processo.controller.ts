import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EtapasProcessoService } from './etapas-processo.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('etapas-processo')
@Controller('etapas-processo')
export class EtapasProcessoController {
  constructor(private readonly etapasProcessoService: EtapasProcessoService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista etapas do processo, opcionalmente de uma candidatura (público)',
  })
  findAll(@Query('candidatura') candidatura?: string) {
    if (candidatura) {
      return this.etapasProcessoService.findByCandidatura(Number(candidatura));
    }
    return this.etapasProcessoService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary:
      'Detalha uma etapa com candidatura, gestor e recursos (público)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.etapasProcessoService.findOne(id);
  }
}
