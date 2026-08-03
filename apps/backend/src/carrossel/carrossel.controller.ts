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
import { CarrosselService } from './carrossel.service';
import { CreateCarrosselManualDto } from './dto/create-carrossel-manual.dto';
import { UpdateCarrosselItemDto } from './dto/update-carrossel-item.dto';
import { ReorderCarrosselDto } from './dto/reorder-carrossel.dto';
import { PatchAutoHabilitadoDto } from './dto/patch-auto-habilitado.dto';

@ApiTags('carrossel')
@Controller('carrossel')
export class CarrosselController {
  constructor(private readonly carrosselService: CarrosselService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Feed público do carrossel (schedule + ativo + auto toggle + edital aberto)',
  })
  findPublic() {
    return this.carrosselService.findPublic();
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista todos os itens (incl. inativos / fora de janela) (JWT)',
  })
  findGestao() {
    return this.carrosselService.findGestao();
  }

  @Post('sincronizar-auto')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary:
      'Reconcile auto_edital rows for all open editais (publicado+inscrições)',
  })
  sincronizarAuto() {
    return this.carrosselService.sincronizarAuto();
  }

  @Put('reorder')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Reordena itens do carrossel (JWT)' })
  reorder(@Body() dto: ReorderCarrosselDto) {
    return this.carrosselService.reorder(dto.ids);
  }

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Cria item manual do carrossel (JWT)' })
  create(@Body() dto: CreateCarrosselManualDto) {
    return this.carrosselService.createManual(dto);
  }

  @Patch(':id/auto-habilitado')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Toggle auto_edital_habilitado (JWT)' })
  setAutoHabilitado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchAutoHabilitadoDto,
  ) {
    return this.carrosselService.setAutoHabilitado(
      id,
      dto.auto_edital_habilitado,
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza item do carrossel (JWT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarrosselItemDto,
  ) {
    return this.carrosselService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description:
      'true = hard delete (manual only); default soft when id_edital linked',
  })
  @ApiOperation({
    summary:
      'Remove item manual (soft se id_edital; hard opcional). Auto → 4xx.',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('hard') hard?: string,
  ) {
    return this.carrosselService.remove(
      id,
      hard === 'true' || hard === '1',
    );
  }
}
