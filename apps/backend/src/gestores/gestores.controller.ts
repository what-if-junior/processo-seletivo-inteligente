import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GestoresService } from './gestores.service';

@ApiTags('gestores')
@Controller('gestores')
export class GestoresController {
  constructor(private readonly gestoresService: GestoresService) {}

  @Get()
  @ApiOperation({ summary: 'Lista gestores com o usuário vinculado' })
  findAll() {
    return this.gestoresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um gestor' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gestoresService.findOne(id);
  }
}
