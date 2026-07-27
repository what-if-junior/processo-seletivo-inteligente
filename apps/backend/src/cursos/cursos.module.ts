import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CursosService } from './cursos.service';
import { CursosController } from './cursos.controller';
import { Curso } from './entities/curso.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { CandidaturasModule } from '../candidaturas/candidaturas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Curso, Oferta]), CandidaturasModule],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
