import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoGlobal } from './entities/configuracao-global.entity';
import { FaixaSalarioMinimo } from './entities/faixa-salario-minimo.entity';
import { FaixasService } from './faixas.service';
import { FaixasController } from './faixas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FaixaSalarioMinimo, ConfiguracaoGlobal]),
  ],
  controllers: [FaixasController],
  providers: [FaixasService],
  exports: [FaixasService],
})
export class FaixasModule {}
