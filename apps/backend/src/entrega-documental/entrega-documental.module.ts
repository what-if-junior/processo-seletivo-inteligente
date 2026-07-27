import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoEntregaDocumental } from './entities/configuracao-entrega-documental.entity';
import { EntregaDocumentalService } from './entrega-documental.service';
import { EntregaDocumentalController } from './entrega-documental.controller';
import { Edital } from '../editais/entities/edital.entity';
import { Campus } from '../campus/entities/campus.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { CronogramaEtapa } from '../cronograma/entities/cronograma-etapa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfiguracaoEntregaDocumental,
      Edital,
      Campus,
      Curso,
      CronogramaEtapa,
    ]),
  ],
  controllers: [EntregaDocumentalController],
  providers: [EntregaDocumentalService],
  exports: [EntregaDocumentalService],
})
export class EntregaDocumentalModule {}
