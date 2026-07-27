import {
  Body,
  Controller,
  Get,
  Param,
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
import { CandidaturasService } from './candidaturas.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';

@ApiTags('candidaturas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('candidaturas')
export class CandidaturasController {
  constructor(private readonly candidaturasService: CandidaturasService) {}

  @Get()
  @ApiQuery({
    name: 'usuario',
    required: false,
    description: 'Filtra candidaturas pelo id do usuário (PWA Inscrições)',
  })
  @ApiOperation({
    summary:
      'Lista candidaturas com usuário e oferta; opcionalmente por ?usuario= (requer JWT)',
  })
  findAll(@Query('usuario') usuario?: string) {
    if (usuario != null && usuario !== '') {
      return this.candidaturasService.findByUsuario(Number(usuario));
    }
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
      'Cria candidatura na janela de Inscrição; bloqueia 2ª ativa no mesmo edital (REQ-2.2)',
  })
  create(@Body() createCandidaturaDto: CreateCandidaturaDto) {
    return this.candidaturasService.create(createCandidaturaDto);
  }

  @Patch(':id/cancelar')
  @ApiOperation({
    summary:
      'Cancela inscrição → cancelada; só na janela efetiva de Inscrição (REQ-2.2)',
  })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.candidaturasService.cancel(id);
  }
}
