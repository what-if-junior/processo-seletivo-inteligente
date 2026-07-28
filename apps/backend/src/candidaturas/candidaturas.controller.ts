import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
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
  @ApiQuery({
    name: 'protocolo',
    required: false,
    description: 'Localiza candidatura pelo protocolo exato (admin REQ-2.5)',
  })
  @ApiOperation({
    summary:
      'Lista candidaturas; opcional ?usuario= ou ?protocolo= (requer JWT)',
  })
  async findAll(
    @Query('usuario') usuario?: string,
    @Query('protocolo') protocolo?: string,
  ) {
    if (protocolo != null && protocolo !== '') {
      const found = await this.candidaturasService.findByProtocolo(protocolo);
      return found ? [found] : [];
    }
    if (usuario != null && usuario !== '') {
      return this.candidaturasService.findByUsuario(Number(usuario));
    }
    return this.candidaturasService.findAll();
  }

  @Get(':id/comprovante.pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({
    summary:
      'Baixa comprovante PDF com protocolo e QR de validação (REQ-2.5)',
  })
  async downloadComprovante(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const { buffer, filename } =
      await this.candidaturasService.getComprovantePdf(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
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
