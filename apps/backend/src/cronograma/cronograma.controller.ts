import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CronogramaService } from './cronograma.service';
import { CreateCronogramaEtapaDto } from './dto/create-cronograma-etapa.dto';
import { UpdateCronogramaEtapaDto } from './dto/update-cronograma-etapa.dto';
import { ReorderCronogramaDto } from './dto/reorder-cronograma.dto';

@ApiTags('cronograma')
@Controller('editais/:editalId/cronograma')
export class CronogramaController {
  constructor(private readonly cronogramaService: CronogramaService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Lista etapas do cronograma de edital publicado (público). Rascunhos: GET .../gestao',
  })
  findAllPublic(@Param('editalId', ParseIntPipe) editalId: number) {
    return this.cronogramaService.findAllPublic(editalId);
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Lista cronograma inclusive de edital rascunho (JWT)',
  })
  findAllGestao(@Param('editalId', ParseIntPipe) editalId: number) {
    return this.cronogramaService.findAllGestao(editalId);
  }

  @Get('gestao/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Detalhe de etapa com warnings (JWT)' })
  findOneGestao(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cronogramaService.findOneGestao(editalId, id);
  }

  @Put('ordem')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Reordena etapas do cronograma (JWT)' })
  reorder(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Body() dto: ReorderCronogramaDto,
  ) {
    return this.cronogramaService.reorder(editalId, dto.ids);
  }

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Cria etapa no cronograma do edital (JWT)' })
  create(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Body() dto: CreateCronogramaEtapaDto,
  ) {
    return this.cronogramaService.create(editalId, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de etapa (público se edital publicado)',
  })
  findOnePublic(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cronogramaService.findOnePublic(editalId, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza etapa do cronograma (JWT)' })
  update(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCronogramaEtapaDto,
  ) {
    return this.cronogramaService.update(editalId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove etapa do cronograma (JWT)' })
  async remove(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('notificar_candidatos') notificar?: string,
  ) {
    await this.cronogramaService.remove(
      editalId,
      id,
      notificar === 'true' || notificar === '1',
    );
  }
}
