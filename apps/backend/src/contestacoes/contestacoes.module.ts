import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contestacao } from './entities/contestacao.entity';
import { ContestacaoHistorico } from './entities/contestacao-historico.entity';
import { ContestacoesController } from './contestacoes.controller';
import { ContestacoesService } from './contestacoes.service';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CronogramaModule } from '../cronograma/cronograma.module';
import { TemplateEdital } from '../templates/entities/template-edital.entity';
import { TemplateBiblioteca } from '../templates/entities/template-biblioteca.entity';
import { Gestor } from '../gestores/entities/gestor.entity';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contestacao,
      ContestacaoHistorico,
      Candidatura,
      TemplateEdital,
      TemplateBiblioteca,
      Gestor,
    ]),
    CronogramaModule,
    NotificacoesModule,
  ],
  controllers: [ContestacoesController],
  providers: [ContestacoesService],
  exports: [ContestacoesService],
})
export class ContestacoesModule {}
