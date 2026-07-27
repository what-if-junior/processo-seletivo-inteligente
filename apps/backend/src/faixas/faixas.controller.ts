import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { FaixasService } from './faixas.service';
import { CreateFaixaDto } from './dto/create-faixa.dto';
import { UpdateFaixaDto } from './dto/update-faixa.dto';
import { UpdateSmReferenciaDto } from './dto/update-sm-referencia.dto';
import { ReorderFaixasDto } from './dto/reorder-faixas.dto';

@ApiTags('faixas-sm')
@Controller('faixas-sm')
export class FaixasController {
  constructor(private readonly faixasService: FaixasService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista faixas SM ativas + referência SM (público). Regra B se vazias.',
  })
  findPublic() {
    return this.faixasService.findPublic();
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista todas as faixas (incl. inativas) + SM + warnings (JWT)',
  })
  findGestao() {
    return this.faixasService.findGestao();
  }

  @Get('gestao/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Detalhe de faixa com envelope de warnings (JWT)' })
  findOneGestao(@Param('id', ParseIntPipe) id: number) {
    return this.faixasService.findOneGestao(id);
  }

  @Patch('referencia')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza salário mínimo de referência (JWT)' })
  updateReferencia(@Body() dto: UpdateSmReferenciaDto) {
    return this.faixasService.updateReferencia(dto.salario_minimo_referencia);
  }

  @Put('ordem')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Reordena faixas SM (JWT)' })
  reorder(@Body() dto: ReorderFaixasDto) {
    return this.faixasService.reorder(dto.ids);
  }

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Cria faixa SM (JWT)' })
  create(@Body() dto: CreateFaixaDto) {
    return this.faixasService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza faixa SM (JWT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFaixaDto,
  ) {
    return this.faixasService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'true = apaga permanentemente; default = soft (ativo=false)',
  })
  @ApiOperation({
    summary:
      'Desativa faixa (soft) ou hard-delete. Soft preserva id para W17.',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('hard') hard?: string,
  ) {
    return this.faixasService.remove(id, hard === 'true' || hard === '1');
  }
}
