import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';

@ApiTags('documentos')
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista documentos, opcionalmente de uma candidatura',
  })
  findAll(@Query('candidatura') candidatura?: string) {
    if (candidatura) {
      return this.documentosService.findByCandidatura(Number(candidatura));
    }
    return this.documentosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um documento (sem o binário)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentosService.findOne(id);
  }
}
