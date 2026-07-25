import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtapaProcesso } from './entities/etapa-processo.entity';
import { EtapasProcessoService } from './etapas-processo.service';
import { EtapasProcessoController } from './etapas-processo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtapaProcesso])],
  controllers: [EtapasProcessoController],
  providers: [EtapasProcessoService],
  exports: [EtapasProcessoService],
})
export class EtapasProcessoModule {}
