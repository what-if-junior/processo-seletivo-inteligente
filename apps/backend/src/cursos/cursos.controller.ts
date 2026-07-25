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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CursosService } from './cursos.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';

@ApiTags('cursos')
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um curso/edital' })
  create(@Body() createCursoDto: CreateCursoDto) {
    return this.cursosService.create(createCursoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista cursos' })
  findAll() {
    return this.cursosService.findAll();
  }

  @Get(':id/candidaturas')
  @ApiOperation({ summary: 'Lista candidaturas de um curso' })
  findCandidaturas(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.findCandidaturas(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca curso por id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um curso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCursoDto: UpdateCursoDto,
  ) {
    return this.cursosService.update(id, updateCursoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um curso' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cursosService.remove(id);
  }
}
