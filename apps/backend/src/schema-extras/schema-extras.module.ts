import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contestacao } from '../contestacoes/entities/contestacao.entity';
import { ContestacaoHistorico } from '../contestacoes/entities/contestacao-historico.entity';
import { Notificacao } from '../notificacoes/entities/notificacao.entity';
import { NotificacaoLeitura } from '../notificacoes/entities/notificacao-leitura.entity';
import { PreferenciaNotificacao } from '../notificacoes/entities/preferencia-notificacao.entity';
import { CarrosselItem } from '../carrossel/entities/carrossel-item.entity';
import { ConfiguracaoGlobal } from '../faixas/entities/configuracao-global.entity';
import { FaixaSalarioMinimo } from '../faixas/entities/faixa-salario-minimo.entity';
import { TemplateBiblioteca } from '../templates/entities/template-biblioteca.entity';
import { TemplateEdital } from '../templates/entities/template-edital.entity';

/**
 * W2 schema extras — entity registration only.
 * Faixas HTTP = FaixasModule (W7); others arrive in W29–W32.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contestacao,
      ContestacaoHistorico,
      Notificacao,
      NotificacaoLeitura,
      PreferenciaNotificacao,
      CarrosselItem,
      ConfiguracaoGlobal,
      FaixaSalarioMinimo,
      TemplateBiblioteca,
      TemplateEdital,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class SchemaExtrasModule {}
