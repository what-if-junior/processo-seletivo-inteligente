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
import { UpdateTipoVagaDto } from '../socioeconomico/dto/socioeconomico.dto';
import { SocioeconomicoService } from '../socioeconomico/socioeconomico.service';

@ApiTags('candidaturas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@Controller('candidaturas')
export class CandidaturasController {
  constructor(
    private readonly candidaturasService: CandidaturasService,
    private readonly socioeconomicoService: SocioeconomicoService,
  ) {}

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

  @Get(':id/socioeconomico')
  @ApiOperation({
    summary:
      'Resposta socioeconómica ativa + arquivadas (REQ-2.3); incompleto sob regra B',
  })
  getSocioeconomico(@Param('id', ParseIntPipe) id: number) {
    return this.socioeconomicoService.findByCandidatura(id);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Detalha uma candidatura com documentos, etapas, recursos e socio (requer JWT)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidaturasService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria candidatura; socio se BAIXA_RENDA (REQ-2.2 / 2.3)',
  })
  create(@Body() createCandidaturaDto: CreateCandidaturaDto) {
    return this.candidaturasService.create(createCandidaturaDto);
  }

  @Patch(':id/tipo-vaga')
  @ApiOperation({
    summary:
      'Troca cota/tipo_vaga; arquiva respostas socioeconómicas anteriores (REQ-2.3)',
  })
  updateTipoVaga(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoVagaDto,
  ) {
    return this.candidaturasService.updateTipoVaga(id, dto);
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
