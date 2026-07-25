import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GestoresService } from './gestores.service';

@ApiTags('gestores')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('gestores')
export class GestoresController {
  constructor(private readonly gestoresService: GestoresService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista gestores com o usuário vinculado (requer JWT)',
  })
  findAll() {
    return this.gestoresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um gestor (requer JWT)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gestoresService.findOne(id);
  }
}
