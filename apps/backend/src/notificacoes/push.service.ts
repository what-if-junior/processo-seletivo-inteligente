import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';
import { CanalNotificacao, StatusEntregaNotificacao } from '@repo/types';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { User } from '../user/entities/user.entity';
import { SubscribePushDto } from './dto/subscribe-push.dto';

/** Payload de push enviado ao service worker (contrato PWA). */
export type PushPayload = {
  titulo: string;
  corpo: string;
  deep_link?: string | null;
  url?: string | null;
};

/** Resultado de sendToUser. */
export type PushSendResult = {
  enviadas: number;
  motivo?: 'vapid_ausente' | 'sem_assinaturas' | 'silenciar_push';
};

/**
 * W31-09 — Transporte Web Push (VAPID).
 *
 * Fail-closed: sem `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` o push fica desativado
 * (nunca lança, nunca envia). As assinaturas continuam sendo armazenadas para
 * quando a ops configurar as chaves.
 *
 * Entregas push são registradas em `NotificacaoEntregas` com `canal: 'pwa'` e
 * `detalhe: 'push'` — evita migração do enum CANAL_NOTIFICACAO.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subRepo: Repository<PushSubscription>,
    @InjectRepository(NotificacaoEntrega)
    private readonly entregaRepo: Repository<NotificacaoEntrega>,
    @InjectRepository(PreferenciaNotificacao)
    private readonly prefRepo: Repository<PreferenciaNotificacao>,
  ) {}

  /** Push ativo somente quando as chaves VAPID existem no ambiente. */
  isEnabled(): boolean {
    return Boolean(
      process.env.VAPID_PUBLIC_KEY?.trim() &&
        process.env.VAPID_PRIVATE_KEY?.trim(),
    );
  }

  /**
   * Armazena (ou atualiza) a assinatura do usuário. Mesmo sem VAPID a linha é
   * gravada — o envio passa a funcionar assim que a ops configurar as chaves.
   */
  async subscribe(
    idUsuario: number,
    dto: SubscribePushDto,
  ): Promise<PushSubscription> {
    let sub = await this.subRepo.findOne({
      where: { id_usuario: idUsuario, endpoint: dto.endpoint },
    });
    if (sub) {
      sub.p256dh = dto.p256dh;
      sub.auth = dto.auth;
      sub.user_agent = dto.user_agent ?? sub.user_agent;
      return this.subRepo.save(sub);
    }
    return this.subRepo.save(
      this.subRepo.create({
        id_usuario: idUsuario,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        user_agent: dto.user_agent ?? null,
        usuario: { id: idUsuario } as User,
      }),
    );
  }

  async unsubscribe(idUsuario: number, endpoint: string): Promise<void> {
    await this.subRepo.delete({ id_usuario: idUsuario, endpoint });
  }

  /** Quantas assinaturas o usuário tem registradas (para GET status). */
  async countForUser(idUsuario: number): Promise<number> {
    return this.subRepo.count({ where: { id_usuario: idUsuario } });
  }

  /**
   * Envia push para todas as assinaturas do usuário. Não lança em nenhum
   * cenário (fail-closed). Respeita `silenciar_push`.
   *
   * `idNotificacao` vincula as linhas de entrega à notificação de origem
   * (FK obrigatória em NotificacaoEntregas).
   */
  async sendToUser(
    idUsuario: number,
    payload: PushPayload,
    idNotificacao: number,
  ): Promise<PushSendResult> {
    if (!this.isEnabled()) {
      return { enviadas: 0, motivo: 'vapid_ausente' };
    }

    const pref = await this.prefRepo.findOne({
      where: { id_usuario: idUsuario },
    });
    if (pref?.silenciar_push) {
      await this.registrarEntrega({
        idUsuario,
        idNotificacao,
        status: StatusEntregaNotificacao.OMITIDO_PREFERENCIA,
        detalhe: 'push: silenciar_push',
      });
      return { enviadas: 0, motivo: 'silenciar_push' };
    }

    const subs = await this.subRepo.find({
      where: { id_usuario: idUsuario },
    });
    if (subs.length === 0) {
      return { enviadas: 0, motivo: 'sem_assinaturas' };
    }

    let enviadas = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            titulo: payload.titulo,
            corpo: payload.corpo,
            deep_link: payload.deep_link ?? null,
            url: payload.deep_link ?? null,
          } satisfies PushPayload),
        );
        enviadas += 1;
        await this.registrarEntrega({
          idUsuario,
          idNotificacao,
          status: StatusEntregaNotificacao.ENVIADO,
          detalhe: 'push',
        });
      } catch (err) {
        const statusCode =
          (err as { statusCode?: number })?.statusCode ?? undefined;
        if (statusCode === 404 || statusCode === 410) {
          // Assinatura expirada — remove e não tenta de novo.
          await this.subRepo.delete(sub.id);
          this.logger.warn(
            `push sub ${sub.id} removida (status ${statusCode})`,
          );
          continue;
        }
        this.logger.error(
          `push falhou para sub ${sub.id}: ${(err as Error).message}`,
        );
        await this.registrarEntrega({
          idUsuario,
          idNotificacao,
          status: StatusEntregaNotificacao.FALHOU,
          detalhe: `push: ${(err as Error).message}`,
        });
      }
    }
    return { enviadas };
  }

  private async registrarEntrega(opts: {
    idUsuario: number;
    idNotificacao: number;
    status: StatusEntregaNotificacao;
    detalhe: string;
  }): Promise<void> {
    await this.entregaRepo.save(
      this.entregaRepo.create({
        id_notificacao: opts.idNotificacao,
        id_usuario: opts.idUsuario,
        canal: CanalNotificacao.PWA,
        status: opts.status,
        detalhe: opts.detalhe,
        processado_em: new Date(),
      }),
    );
  }
}