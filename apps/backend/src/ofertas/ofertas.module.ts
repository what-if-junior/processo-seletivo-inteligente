import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oferta } from './entities/oferta.entity';
import { OfertasController } from './ofertas.controller';
import { OfertasService } from './ofertas.service';
import { CandidaturasModule } from '../candidaturas/candidaturas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Oferta]), CandidaturasModule],
  controllers: [OfertasController],
  providers: [OfertasService],
  exports: [OfertasService],
})
export class OfertasModule {}
