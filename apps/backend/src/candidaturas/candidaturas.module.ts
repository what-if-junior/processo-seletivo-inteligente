import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidatura } from './entities/candidatura.entity';
import { CandidaturasService } from './candidaturas.service';
import { CandidaturasController } from './candidaturas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Candidatura])],
  controllers: [CandidaturasController],
  providers: [CandidaturasService],
  exports: [CandidaturasService],
})
export class CandidaturasModule {}
