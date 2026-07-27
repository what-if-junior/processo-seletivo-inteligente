import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CursosService } from './cursos.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('cursos')
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Cria um curso no catálogo (requer JWT)' })
  create(@Body() createCursoDto: CreateCursoDto) {
    return this.cursosService.create(createCursoDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista cursos do catálogo (público)' })
  findAll() {
    return this.cursosService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Busca curso do catálogo por id (público)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza um curso do catálogo (requer JWT)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCursoDto: UpdateCursoDto,
  ) {
    return this.cursosService.update(id, updateCursoDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Remove um curso do catálogo (requer JWT)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.remove(id);
  }
}
