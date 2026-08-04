import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronogramaEtapa } from './entities/cronograma-etapa.entity';
import { CronogramaService } from './cronograma.service';
import { CronogramaController } from './cronograma.controller';
import { Edital } from '../editais/entities/edital.entity';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CronogramaEtapa, Edital]),
    forwardRef(() => NotificacoesModule),
  ],
  controllers: [CronogramaController],
  providers: [CronogramaService],
  exports: [CronogramaService],
})
export class CronogramaModule {}
