import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidatura } from './entities/candidatura.entity';
import { CandidaturasService } from './candidaturas.service';
import { CandidaturasController } from './candidaturas.controller';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { User } from '../user/entities/user.entity';
import { CronogramaModule } from '../cronograma/cronograma.module';
import { SocioeconomicoModule } from '../socioeconomico/socioeconomico.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Candidatura, Oferta, User]),
    CronogramaModule,
    SocioeconomicoModule,
  ],
  controllers: [CandidaturasController],
  providers: [CandidaturasService],
  exports: [CandidaturasService],
})
export class CandidaturasModule {}
