import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronogramaEtapa } from './entities/cronograma-etapa.entity';
import { CronogramaService } from './cronograma.service';
import { CronogramaController } from './cronograma.controller';
import { Edital } from '../editais/entities/edital.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CronogramaEtapa, Edital])],
  controllers: [CronogramaController],
  providers: [CronogramaService],
  exports: [CronogramaService],
})
export class CronogramaModule {}
