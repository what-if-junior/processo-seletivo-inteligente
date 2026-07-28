import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoGlobal } from './entities/configuracao-global.entity';
import { FaixaSalarioMinimo } from './entities/faixa-salario-minimo.entity';
import { FaixasService } from './faixas.service';
import { FaixasController } from './faixas.controller';
import { SocioeconomicoModule } from '../socioeconomico/socioeconomico.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FaixaSalarioMinimo, ConfiguracaoGlobal]),
    forwardRef(() => SocioeconomicoModule),
  ],
  controllers: [FaixasController],
  providers: [FaixasService],
  exports: [FaixasService],
})
export class FaixasModule {}
