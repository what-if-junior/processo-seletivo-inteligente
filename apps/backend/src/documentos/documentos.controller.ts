import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';

@ApiTags('documentos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista documentos, opcionalmente de uma candidatura (requer JWT)',
  })
  findAll(@Query('candidatura') candidatura?: string) {
    if (candidatura) {
      return this.documentosService.findByCandidatura(Number(candidatura));
    }
    return this.documentosService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalha um documento sem o binário (requer JWT)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentosService.findOne(id);
  }
}
