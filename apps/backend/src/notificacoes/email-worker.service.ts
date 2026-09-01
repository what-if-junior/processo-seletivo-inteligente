import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { CanalNotificacao, StatusEntregaNotificacao } from '@repo/types';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { Notificacao } from './entities/notificacao.entity';
import { User } from '../user/entities/user.entity';

/** Resultado de uma rodada de drenagem do outbox de e-mail. */
export interface EmailWorkerResult {
  processados: number;
  enviados: number;
  falhas: number;
  endpoint: string | null;
}

/**
 * W31-08 — Worker de entrega de e-mail (outbox `adiado_smtp` / `pendente`).
 *
 * Não usa nodemailer diretamente: a entrega é feita por **webhook HTTP** para o
 * n8n (`N8N_EMAIL_ENDPOINT`), que é quem conhece o SMTP real. O backend apenas
 * drena a fila durável de intenções:
 *
 *   POST {N8N_EMAIL_ENDPOINT}
 *   { "To": "...", "Subject": "...", "Email Body": "...", "Attachments": [] }
 *
 * Fail-closed: sem `N8N_EMAIL_ENDPOINT` o worker não roda (nada é enviado nem
 * marcado — as linhas permanecem `adiado_smtp` até a ops configurar).
 */
@Injectable()
export class EmailWorkerService {
  private readonly logger = new Logger(EmailWorkerService.name);

  constructor(
    @InjectRepository(NotificacaoEntrega)
    private readonly entregaRepo: Repository<NotificacaoEntrega>,
    @InjectRepository(Notificacao)
    private readonly notifRepo: Repository<Notificacao>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /** O endpoint n8n só existe se `N8N_EMAIL_ENDPOINT` estiver no `.env`. */
  private emailEndpoint(): string | null {
    const url = this.configService.get<string>('N8N_EMAIL_ENDPOINT')?.trim();
    return url || null;
  }

  /**
   * Drain do outbox a cada 60s quando o endpoint n8n está configurado.
   * Linhas `adiado_smtp` (SMTP indisponível no dispatch) ou `pendente`
   * (reservado para o worker) viram `enviado`/`falhou` após a chamada HTTP.
   */
  @Interval(60_000)
  async drainOutbox(): Promise<EmailWorkerResult> {
    const endpoint = this.emailEndpoint();
    if (!endpoint) {
      // Fail-closed: sem endpoint, nada é enviado nem re-marcado.
      return { processados: 0, enviados: 0, falhas: 0, endpoint: null };
    }

    const fila = await this.entregaRepo.find({
      where: {
        canal: CanalNotificacao.EMAIL,
        status: In([
          StatusEntregaNotificacao.ADIADO_SMTP,
          StatusEntregaNotificacao.PENDENTE,
        ]),
        processado_em: IsNull(),
      },
      take: 100,
      order: { id: 'ASC' },
    });

    if (fila.length === 0) {
      return { processados: 0, enviados: 0, falhas: 0, endpoint };
    }

    const idsNotificacoes = [...new Set(fila.map((r) => r.id_notificacao))];
    const notifs = await this.notifRepo.find({
      where: { id: In(idsNotificacoes) },
    });
    const notifById = new Map(notifs.map((n) => [n.id, n]));

    const idsUsuarios = [...new Set(fila.map((r) => r.id_usuario))];
    const users = await this.userRepo.find({ where: { id: In(idsUsuarios) } });
    const userById = new Map(users.map((u) => [u.id, u]));

    let enviados = 0;
    let falhas = 0;

    for (const row of fila) {
      const destino = row.destino ?? userById.get(row.id_usuario)?.email ?? null;
      if (!destino) {
        // Sem destinatário não há o que enviar — marca falha para não re-tentar.
        row.status = StatusEntregaNotificacao.FALHOU;
        row.processado_em = new Date();
        row.detalhe = 'destino (email) ausente';
        await this.entregaRepo.save(row);
        falhas += 1;
        continue;
      }

      const notif = notifById.get(row.id_notificacao);
      const ok = await this.sendViaN8n({ endpoint, destino, notif });
      if (ok) {
        row.status = StatusEntregaNotificacao.ENVIADO;
        row.processado_em = new Date();
        row.detalhe = 'enviado via n8n_email_endpoint';
        await this.entregaRepo.save(row);
        enviados += 1;
      } else {
        row.status = StatusEntregaNotificacao.FALHOU;
        row.processado_em = new Date();
        row.detalhe = 'falha ao enviar via n8n_email_endpoint';
        await this.entregaRepo.save(row);
        falhas += 1;
      }
    }

    this.logger.log(
      `outbox drained: ${fila.length} rows -> ${enviados} enviados, ${falhas} falhas`,
    );
    return { processados: fila.length, enviados, falhas, endpoint };
  }

  /** POST HTTP para o webhook do n8n (JSON opaco — contrato do n8n). */
  private async sendViaN8n(opts: {
    endpoint: string;
    destino: string;
    notif?: Notificacao | null;
  }): Promise<boolean> {
    const { endpoint, destino, notif } = opts;
    const body = {
      To: destino,
      Subject: notif?.titulo ?? 'Aviso do processo seletivo',
      'Email Body': notif?.corpo ?? '',
      Attachments: [],
    };
    try {
      const res = await globalThis.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}