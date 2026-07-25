import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidaturasService } from './candidaturas.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';

@ApiTags('candidaturas')
@Controller('candidaturas')
export class CandidaturasController {
  constructor(private readonly candidaturasService: CandidaturasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista candidaturas com usuário e curso' })
  findAll() {
    return this.candidaturasService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalha uma candidatura com documentos, etapas e recursos',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidaturasService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria candidatura, bloqueando inscrição duplicada no mesmo curso',
  })
  create(@Body() createCandidaturaDto: CreateCandidaturaDto) {
    return this.candidaturasService.create(createCandidaturaDto);
  }
}
