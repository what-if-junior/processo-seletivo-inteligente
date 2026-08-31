import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RecursosService } from './recursos.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('recursos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('recursos')
export class RecursosController {
  constructor(private readonly recursosService: RecursosService) {}

  @Get()
  @Roles('gestor')
  @ApiOperation({
    summary: 'Lista recursos, opcionalmente de uma etapa (requer JWT)',
  })
  findAll(@Query('etapa') etapa?: string) {
    if (etapa) {
      return this.recursosService.findByEtapa(Number(etapa));
    }
    return this.recursosService.findAll();
  }

  @Get(':id')
  @Roles('gestor')
  @ApiOperation({
    summary: 'Detalha um recurso com etapa e gestor (requer JWT)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recursosService.findOne(id);
  }
}
