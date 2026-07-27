import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CandidaturasService } from './candidaturas.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';

@ApiTags('candidaturas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('candidaturas')
export class CandidaturasController {
  constructor(private readonly candidaturasService: CandidaturasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista candidaturas com usuário e oferta (requer JWT)',
  })
  findAll() {
    return this.candidaturasService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Detalha uma candidatura com documentos, etapas e recursos (requer JWT)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidaturasService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Cria candidatura, bloqueando inscrição ativa duplicada no mesmo edital (requer JWT)',
  })
  create(@Body() createCandidaturaDto: CreateCandidaturaDto) {
    return this.candidaturasService.create(createCandidaturaDto);
  }
}
