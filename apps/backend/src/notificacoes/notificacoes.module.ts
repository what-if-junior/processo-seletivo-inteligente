import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacao } from './entities/notificacao.entity';
import { NotificacaoLeitura } from './entities/notificacao-leitura.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { LembreteNotificacao } from './entities/lembrete-notificacao.entity';
import { LembreteDisparo } from './entities/lembrete-disparo.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { User } from '../user/entities/user.entity';
import { CronogramaEtapa } from '../cronograma/entities/cronograma-etapa.entity';
import { Edital } from '../editais/entities/edital.entity';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesController } from './notificacoes.controller';
import { PushService } from './push.service';
import { EmailWorkerService } from './email-worker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacao,
      NotificacaoLeitura,
      PreferenciaNotificacao,
      NotificacaoEntrega,
      LembreteNotificacao,
      LembreteDisparo,
      PushSubscription,
      Candidatura,
      User,
      CronogramaEtapa,
      Edital,
    ]),
  ],
  controllers: [NotificacoesController],
  providers: [NotificacoesService, PushService, EmailWorkerService],
  exports: [NotificacoesService, PushService],
})
export class NotificacoesModule {}
