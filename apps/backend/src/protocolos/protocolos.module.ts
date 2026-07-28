import { Module } from '@nestjs/common';
import { CandidaturasModule } from '../candidaturas/candidaturas.module';
import { ProtocolosController } from './protocolos.controller';
import { ProtocolosService } from './protocolos.service';

@Module({
  imports: [CandidaturasModule],
  controllers: [ProtocolosController],
  providers: [ProtocolosService],
  exports: [ProtocolosService],
})
export class ProtocolosModule {}
