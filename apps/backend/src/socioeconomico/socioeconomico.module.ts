import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RespostaSocioeconomica } from './entities/resposta-socioeconomica.entity';
import { SocioeconomicoService } from './socioeconomico.service';
import { FaixaSalarioMinimo } from '../faixas/entities/faixa-salario-minimo.entity';
import { ConfiguracaoGlobal } from '../faixas/entities/configuracao-global.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RespostaSocioeconomica,
      FaixaSalarioMinimo,
      ConfiguracaoGlobal,
      Candidatura,
    ]),
  ],
  providers: [SocioeconomicoService],
  exports: [SocioeconomicoService],
})
export class SocioeconomicoModule {}
