import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
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
import { EditaisService } from './editais.service';
import { CreateEditalDto } from './dto/create-edital.dto';
import { UpdateEditalDto } from './dto/update-edital.dto';

@ApiTags('editais')
@Controller('editais')
export class EditaisController {
  constructor(private readonly editaisService: EditaisService) {}

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Cria um edital (requer JWT)' })
  create(@Body() dto: CreateEditalDto) {
    return this.editaisService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lista editais (público); filtros opcionais por publicação',
  })
  @ApiQuery({ name: 'publicado', required: false, type: Boolean })
  @ApiQuery({ name: 'inscricoes_abertas', required: false, type: Boolean })
  findAll(
    @Query('publicado', new ParseBoolPipe({ optional: true }))
    publicado?: boolean,
    @Query('inscricoes_abertas', new ParseBoolPipe({ optional: true }))
    inscricoes_abertas?: boolean,
  ) {
    return this.editaisService.findAll({ publicado, inscricoes_abertas });
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalha edital com ofertas (curso/campus) (público)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza um edital (requer JWT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEditalDto,
  ) {
    return this.editaisService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove um edital (requer JWT)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.editaisService.remove(id);
  }
}
