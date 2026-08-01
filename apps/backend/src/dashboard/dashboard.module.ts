import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Oferta, Candidatura])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
