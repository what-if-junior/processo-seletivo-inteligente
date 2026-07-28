import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { User } from '../user/entities/user.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Oferta, Candidatura])],
  controllers: [LotesController],
  providers: [LotesService],
  exports: [LotesService],
})
export class LotesModule {}
