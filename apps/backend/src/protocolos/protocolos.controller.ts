import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ProtocolosService } from './protocolos.service';

@ApiTags('protocolos')
@Controller('protocolos')
export class ProtocolosController {
  constructor(private readonly protocolosService: ProtocolosService) {}

  @Public()
  @Get(':protocolo')
  @ApiOperation({
    summary:
      'Valida protocolo de inscrição (público). Cancelada → valido=false (REQ-2.5 QR)',
  })
  validar(@Param('protocolo') protocolo: string) {
    return this.protocolosService.validar(protocolo);
  }
}
