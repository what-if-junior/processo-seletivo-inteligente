import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  CanalNotificacao,
  OrigemNotificacao,
  StatusCandidatura,
  StatusEntregaNotificacao,
  TipoEtapaCronograma,
  TipoLembreteNotificacao,
} from '@repo/types';
import { Notificacao } from './entities/notificacao.entity';
import { NotificacaoLeitura } from './entities/notificacao-leitura.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { LembreteNotificacao } from './entities/lembrete-notificacao.entity';
import { LembreteDisparo } from './entities/lembrete-disparo.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { User } from '../user/entities/user.entity';
import { CronogramaEtapa } from '../cronograma/entities/cronograma-etapa.entity';
import { Edital } from '../editais/entities/edital.entity';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { UpdatePreferenciaNotificacaoDto } from './dto/update-preferencia.dto';
import {
  CreateLembreteDto,
  UpdateLembreteDto,
} from './dto/create-lembrete.dto';
import {
  STATUS_COORTE_ATIVA,
  STATUS_COORTE_MATRICULA,
  buildDisparoChave,
  renderTemplate,
} from './notificacoes-audience.util';

export type NotifyUserInput = {
  id_usuario: number;
  titulo: string;
  corpo: string;
  deep_link?: string | null;
  origem?: OrigemNotificacao;
  id_edital?: number | null;
  filtro_status?: string | null;
  id_gestor?: number | null;
  canais?: Array<'pwa' | 'email'>;
  /** Treat as official (respect silenciar_oficiais). Default true for cronograma. */
  oficial?: boolean;
};

export type DispatchResult = {
  notificacao: Notificacao;
  destinatarios: number;
  leituras_criadas: number;
  entregas_email: number;
  email_adiados: number;
  omitidos_preferencia: number;
};

export type CandidateNotificacaoDto = {
  id: number;
  titulo: string;
  corpo: string;
  deep_link: string | null;
  origem: OrigemNotificacao;
  id_edital: number | null;
  criado_em: Date;
  enviado_em: Date | null;
  lida: boolean;
  lida_em: Date | null;
  leitura_id: number;
};

@Injectable()
export class NotificacoesService {
  constructor(
    @InjectRepository(Notificacao)
    private readonly notifRepo: Repository<Notificacao>,
    @InjectRepository(NotificacaoLeitura)
    private readonly leituraRepo: Repository<NotificacaoLeitura>,
    @InjectRepository(PreferenciaNotificacao)
    private readonly prefRepo: Repository<PreferenciaNotificacao>,
    @InjectRepository(NotificacaoEntrega)
    private readonly entregaRepo: Repository<NotificacaoEntrega>,
    @InjectRepository(LembreteNotificacao)
    private readonly lembreteRepo: Repository<LembreteNotificacao>,
    @InjectRepository(LembreteDisparo)
    private readonly disparoRepo: Repository<LembreteDisparo>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepo: Repository<Candidatura>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CronogramaEtapa)
    private readonly etapaRepo: Repository<CronogramaEtapa>,
    @InjectRepository(Edital)
    private readonly editalRepo: Repository<Edital>,
  ) {}

  /** SMTP not wired in MVP — email intents are durable with adiado_smtp. */
  private smtpAvailable(): boolean {
    return Boolean(process.env.SMTP_HOST?.trim());
  }

  async getOrCreatePreferencias(
    idUsuario: number,
  ): Promise<PreferenciaNotificacao> {
    let pref = await this.prefRepo.findOne({
      where: { id_usuario: idUsuario },
    });
    if (!pref) {
      pref = await this.prefRepo.save(
        this.prefRepo.create({
          usuario: { id: idUsuario } as User,
          silenciar_email: false,
          silenciar_push: false,
          silenciar_oficiais: false,
        }),
      );
    }
    return pref;
  }

  async updatePreferencias(
    idUsuario: number,
    dto: UpdatePreferenciaNotificacaoDto,
  ): Promise<PreferenciaNotificacao> {
    const pref = await this.getOrCreatePreferencias(idUsuario);
    if (dto.silenciar_email !== undefined) {
      pref.silenciar_email = dto.silenciar_email;
    }
    if (dto.silenciar_push !== undefined) {
      pref.silenciar_push = dto.silenciar_push;
    }
    if (dto.silenciar_oficiais !== undefined) {
      pref.silenciar_oficiais = dto.silenciar_oficiais;
    }
    return this.prefRepo.save(pref);
  }

  async resolveAudienceUserIds(opts: {
    id_edital?: number | null;
    filtro_campus?: string | null;
    filtro_status?: string | null;
    statusIn?: StatusCandidatura[];
  }): Promise<number[]> {
    const qb = this.candidaturaRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.id_usuario', 'id_usuario');

    if (opts.id_edital != null) {
      qb.andWhere('c.id_edital = :edital', { edital: opts.id_edital });
    }

    if (opts.filtro_status) {
      qb.andWhere('c.status = :status', { status: opts.filtro_status });
    } else if (opts.statusIn?.length) {
      qb.andWhere('c.status IN (:...statuses)', { statuses: opts.statusIn });
    } else {
      qb.andWhere('c.status IN (:...statuses)', {
        statuses: STATUS_COORTE_ATIVA,
      });
    }

    if (opts.filtro_campus?.trim()) {
      qb.innerJoin('c.oferta', 'o')
        .innerJoin('o.campus', 'camp')
        .andWhere('camp.nome ILIKE :campus', {
          campus: opts.filtro_campus.trim(),
        });
    }

    const rows = await qb.getRawMany<{ id_usuario: string | number }>();
    return rows
      .map((r) => Number(r.id_usuario))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  async createAndDispatch(
    dto: CreateNotificacaoDto,
    idGestor?: number | null,
  ): Promise<DispatchResult> {
    const origem = dto.origem ?? OrigemNotificacao.MANUAL;
    const canais = this.normalizeCanais(dto.canais);
    const agendado = dto.agendado_para
      ? new Date(dto.agendado_para)
      : null;
    if (agendado && Number.isNaN(agendado.getTime())) {
      throw new BadRequestException('agendado_para inválido');
    }

    const enviarAgora = dto.enviar_agora !== false && (!agendado || agendado <= new Date());

    const notificacao = await this.notifRepo.save(
      this.notifRepo.create({
        titulo: dto.titulo.trim(),
        corpo: dto.corpo.trim(),
        deep_link: dto.deep_link ?? null,
        origem,
        id_edital: dto.id_edital ?? null,
        filtro_campus: dto.filtro_campus ?? null,
        filtro_status: dto.filtro_status ?? null,
        agendado_para: agendado,
        enviado_em: enviarAgora ? new Date() : null,
        id_gestor: idGestor ?? null,
      }),
    );

    if (!enviarAgora) {
      return {
        notificacao,
        destinatarios: 0,
        leituras_criadas: 0,
        entregas_email: 0,
        email_adiados: 0,
        omitidos_preferencia: 0,
      };
    }

    const userIds = await this.resolveAudienceUserIds({
      id_edital: dto.id_edital,
      filtro_campus: dto.filtro_campus,
      filtro_status: dto.filtro_status,
    });

    return this.dispatchToUsers(notificacao, userIds, {
      canais,
      oficial: origem === OrigemNotificacao.AUTOMATICO_CRONOGRAMA || origem === OrigemNotificacao.MANUAL,
    });
  }

  /**
   * Targeted notify (W27/W30 / single user). Returns notificacao id.
   */
  async notifyUser(input: NotifyUserInput): Promise<number> {
    const canais = this.normalizeCanais(input.canais);
    const oficial =
      input.oficial ??
      input.origem === OrigemNotificacao.AUTOMATICO_CRONOGRAMA;

    const notificacao = await this.notifRepo.save(
      this.notifRepo.create({
        titulo: input.titulo,
        corpo: input.corpo,
        deep_link: input.deep_link ?? null,
        origem: input.origem ?? OrigemNotificacao.MANUAL,
        id_edital: input.id_edital ?? null,
        filtro_status: input.filtro_status ?? null,
        enviado_em: new Date(),
        id_gestor: input.id_gestor ?? null,
      }),
    );

    await this.dispatchToUsers(notificacao, [input.id_usuario], {
      canais,
      oficial,
    });
    return notificacao.id;
  }

  /**
   * Notify active cohort on edital/phase change when admin checks the box.
   */
  async notifyCohortChange(opts: {
    id_edital: number;
    titulo: string;
    corpo: string;
    deep_link?: string;
    id_gestor?: number | null;
    filtro_status?: string | null;
    statusIn?: StatusCandidatura[];
  }): Promise<DispatchResult | null> {
    const userIds = await this.resolveAudienceUserIds({
      id_edital: opts.id_edital,
      filtro_status: opts.filtro_status,
      statusIn: opts.statusIn ?? STATUS_COORTE_ATIVA,
    });
    if (userIds.length === 0) {
      return null;
    }

    const notificacao = await this.notifRepo.save(
      this.notifRepo.create({
        titulo: opts.titulo,
        corpo: opts.corpo,
        deep_link: opts.deep_link ?? `/inscricoes?edital=${opts.id_edital}`,
        origem: OrigemNotificacao.AUTOMATICO_CRONOGRAMA,
        id_edital: opts.id_edital,
        filtro_status: opts.filtro_status ?? null,
        enviado_em: new Date(),
        id_gestor: opts.id_gestor ?? null,
      }),
    );

    return this.dispatchToUsers(notificacao, userIds, {
      canais: ['pwa', 'email'],
      oficial: true,
    });
  }

  private normalizeCanais(
    canais?: string[] | Array<'pwa' | 'email'>,
  ): Array<'pwa' | 'email'> {
    if (!canais?.length) return ['pwa', 'email'];
    const out = new Set<'pwa' | 'email'>();
    for (const c of canais) {
      const n = String(c).toLowerCase();
      if (n === 'pwa' || n === 'app') out.add('pwa');
      else if (n === 'email' || n === 'e-mail') out.add('email');
    }
    if (out.size === 0) {
      throw new BadRequestException('canais deve incluir pwa e/ou email');
    }
    return [...out];
  }

  private async dispatchToUsers(
    notificacao: Notificacao,
    userIds: number[],
    opts: { canais: Array<'pwa' | 'email'>; oficial: boolean },
  ): Promise<DispatchResult> {
    let leituras = 0;
    let entregasEmail = 0;
    let emailAdiados = 0;
    let omitidos = 0;

    const unique = [...new Set(userIds)];
    for (const idUsuario of unique) {
      const pref = await this.getOrCreatePreferencias(idUsuario);

      if (opts.oficial && pref.silenciar_oficiais) {
        omitidos += 1;
        if (opts.canais.includes('pwa')) {
          await this.entregaRepo.save(
            this.entregaRepo.create({
              id_notificacao: notificacao.id,
              id_usuario: idUsuario,
              canal: CanalNotificacao.PWA,
              status: StatusEntregaNotificacao.OMITIDO_PREFERENCIA,
              detalhe: 'silenciar_oficiais',
              processado_em: new Date(),
            }),
          );
        }
        if (opts.canais.includes('email')) {
          await this.entregaRepo.save(
            this.entregaRepo.create({
              id_notificacao: notificacao.id,
              id_usuario: idUsuario,
              canal: CanalNotificacao.EMAIL,
              status: StatusEntregaNotificacao.OMITIDO_PREFERENCIA,
              detalhe: 'silenciar_oficiais',
              processado_em: new Date(),
            }),
          );
        }
        continue;
      }

      if (opts.canais.includes('pwa')) {
        await this.leituraRepo.save(
          this.leituraRepo.create({
            id_notificacao: notificacao.id,
            id_usuario: idUsuario,
            lida_em: null,
          }),
        );
        leituras += 1;
        await this.entregaRepo.save(
          this.entregaRepo.create({
            id_notificacao: notificacao.id,
            id_usuario: idUsuario,
            canal: CanalNotificacao.PWA,
            status: StatusEntregaNotificacao.ENVIADO,
            detalhe: 'in-app leitura criada',
            processado_em: new Date(),
          }),
        );
      }

      if (opts.canais.includes('email')) {
        entregasEmail += 1;
        const user = await this.userRepo.findOne({ where: { id: idUsuario } });
        if (pref.silenciar_email) {
          omitidos += 1;
          await this.entregaRepo.save(
            this.entregaRepo.create({
              id_notificacao: notificacao.id,
              id_usuario: idUsuario,
              canal: CanalNotificacao.EMAIL,
              status: StatusEntregaNotificacao.OMITIDO_PREFERENCIA,
              destino: user?.email ?? null,
              detalhe: 'silenciar_email',
              processado_em: new Date(),
            }),
          );
        } else if (!this.smtpAvailable()) {
          emailAdiados += 1;
          await this.entregaRepo.save(
            this.entregaRepo.create({
              id_notificacao: notificacao.id,
              id_usuario: idUsuario,
              canal: CanalNotificacao.EMAIL,
              status: StatusEntregaNotificacao.ADIADO_SMTP,
              destino: user?.email ?? null,
              detalhe: 'SMTP_HOST ausente — intent gravado; envio adiado',
              processado_em: new Date(),
            }),
          );
        } else {
          // Future: real nodemailer send. Mark pendente for worker.
          await this.entregaRepo.save(
            this.entregaRepo.create({
              id_notificacao: notificacao.id,
              id_usuario: idUsuario,
              canal: CanalNotificacao.EMAIL,
              status: StatusEntregaNotificacao.PENDENTE,
              destino: user?.email ?? null,
              detalhe: 'queued for SMTP worker',
            }),
          );
        }
      }
    }

    if (!notificacao.enviado_em) {
      notificacao.enviado_em = new Date();
      await this.notifRepo.save(notificacao);
    }

    return {
      notificacao,
      destinatarios: unique.length,
      leituras_criadas: leituras,
      entregas_email: entregasEmail,
      email_adiados: emailAdiados,
      omitidos_preferencia: omitidos,
    };
  }

  async listForUser(idUsuario: number): Promise<{
    items: CandidateNotificacaoDto[];
    unread: number;
  }> {
    const leituras = await this.leituraRepo.find({
      where: { id_usuario: idUsuario },
      relations: ['notificacao'],
      order: { criado_em: 'DESC' },
    });

    const items: CandidateNotificacaoDto[] = [];
    for (const l of leituras) {
      const n = l.notificacao;
      if (!n) continue;
      items.push({
        id: n.id,
        titulo: n.titulo,
        corpo: n.corpo,
        deep_link: n.deep_link ?? null,
        origem: n.origem,
        id_edital: n.id_edital ?? null,
        criado_em: n.criado_em,
        enviado_em: n.enviado_em ?? null,
        lida: Boolean(l.lida_em),
        lida_em: l.lida_em ?? null,
        leitura_id: l.id,
      });
    }
    const unread = items.filter((i) => !i.lida).length;
    return { items, unread };
  }

  async markRead(
    idUsuario: number,
    idNotificacao: number,
  ): Promise<CandidateNotificacaoDto> {
    const leitura = await this.leituraRepo.findOne({
      where: { id_notificacao: idNotificacao, id_usuario: idUsuario },
      relations: ['notificacao'],
    });
    if (!leitura?.notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }
    if (!leitura.lida_em) {
      leitura.lida_em = new Date();
      await this.leituraRepo.save(leitura);
    }
    const n = leitura.notificacao;
    return {
      id: n.id,
      titulo: n.titulo,
      corpo: n.corpo,
      deep_link: n.deep_link ?? null,
      origem: n.origem,
      id_edital: n.id_edital ?? null,
      criado_em: n.criado_em,
      enviado_em: n.enviado_em ?? null,
      lida: true,
      lida_em: leitura.lida_em,
      leitura_id: leitura.id,
    };
  }

  async markAllRead(idUsuario: number): Promise<{ updated: number }> {
    const unread = await this.leituraRepo.find({
      where: { id_usuario: idUsuario, lida_em: IsNull() },
    });
    const now = new Date();
    for (const l of unread) {
      l.lida_em = now;
    }
    if (unread.length) {
      await this.leituraRepo.save(unread);
    }
    return { updated: unread.length };
  }

  async listGestao(idEdital?: number): Promise<Notificacao[]> {
    if (idEdital != null) {
      return this.notifRepo.find({
        where: { id_edital: idEdital },
        order: { criado_em: 'DESC' },
        take: 200,
      });
    }
    return this.notifRepo.find({
      order: { criado_em: 'DESC' },
      take: 200,
    });
  }

  // ─── Lembretes ─────────────────────────────────────────────────────────────

  listLembretes(): Promise<LembreteNotificacao[]> {
    return this.lembreteRepo.find({ order: { id: 'ASC' } });
  }

  async createLembrete(dto: CreateLembreteDto): Promise<LembreteNotificacao> {
    if (!Object.values(TipoLembreteNotificacao).includes(dto.tipo)) {
      throw new BadRequestException(`tipo inválido: ${dto.tipo}`);
    }
    if (!Number.isFinite(dto.offset_horas)) {
      throw new BadRequestException('offset_horas inválido');
    }
    return this.lembreteRepo.save(
      this.lembreteRepo.create({
        tipo: dto.tipo,
        id_edital: dto.id_edital ?? null,
        offset_horas: dto.offset_horas,
        titulo_template: dto.titulo_template.trim(),
        corpo_template: dto.corpo_template.trim(),
        ativo: dto.ativo ?? true,
      }),
    );
  }

  async updateLembrete(
    id: number,
    dto: UpdateLembreteDto,
  ): Promise<LembreteNotificacao> {
    const row = await this.lembreteRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Lembrete ${id} não encontrado`);
    if (dto.tipo !== undefined) {
      if (!Object.values(TipoLembreteNotificacao).includes(dto.tipo)) {
        throw new BadRequestException(`tipo inválido: ${dto.tipo}`);
      }
      row.tipo = dto.tipo;
    }
    if (dto.id_edital !== undefined) row.id_edital = dto.id_edital;
    if (dto.offset_horas !== undefined) row.offset_horas = dto.offset_horas;
    if (dto.titulo_template !== undefined) {
      row.titulo_template = dto.titulo_template.trim();
    }
    if (dto.corpo_template !== undefined) {
      row.corpo_template = dto.corpo_template.trim();
    }
    if (dto.ativo !== undefined) row.ativo = dto.ativo;
    return this.lembreteRepo.save(row);
  }

  async removeLembrete(id: number): Promise<void> {
    const result = await this.lembreteRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Lembrete ${id} não encontrado`);
    }
  }

  /**
   * Process due reminders (matrícula deadline approaching, etc.).
   * Idempotent via LembreteDisparos.chave.
   */
  async processLembretes(now = new Date()): Promise<{
    processed: number;
    disparos: number;
    skipped: number;
  }> {
    const lembretes = await this.lembreteRepo.find({ where: { ativo: true } });
    let processed = 0;
    let disparos = 0;
    let skipped = 0;

    for (const lembrete of lembretes) {
      processed += 1;
      const etapas = await this.findEtapasForLembrete(lembrete);
      for (const etapa of etapas) {
        const anchor =
          lembrete.tipo === TipoLembreteNotificacao.ETAPA_INICIO
            ? new Date(etapa.data_inicio)
            : new Date(etapa.data_fim);
        const fireAt = new Date(
          anchor.getTime() + lembrete.offset_horas * 3600_000,
        );
        // Due window: fireAt <= now < anchor (for before-end reminders)
        if (fireAt > now) {
          skipped += 1;
          continue;
        }
        if (
          lembrete.tipo !== TipoLembreteNotificacao.ETAPA_INICIO &&
          anchor < now
        ) {
          // Past end — no longer useful
          skipped += 1;
          continue;
        }

        const edital = await this.editalRepo.findOne({
          where: { id: etapa.id_edital },
        });
        const statusIn =
          lembrete.tipo === TipoLembreteNotificacao.MATRICULA_PRAZO
            ? STATUS_COORTE_MATRICULA
            : STATUS_COORTE_ATIVA;
        const userIds = await this.resolveAudienceUserIds({
          id_edital: etapa.id_edital,
          statusIn,
        });

        const windowIso = fireAt.toISOString().slice(0, 13); // hour bucket
        const vars = {
          edital: edital?.numero_ano ?? String(etapa.id_edital),
          etapa: etapa.nome_exibido,
          data_inicio: new Date(etapa.data_inicio).toISOString(),
          data_fim: new Date(etapa.data_fim).toISOString(),
        };

        for (const idUsuario of userIds) {
          const chave = buildDisparoChave(
            lembrete.id,
            etapa.id,
            idUsuario,
            windowIso,
          );
          const exists = await this.disparoRepo.findOne({ where: { chave } });
          if (exists) {
            skipped += 1;
            continue;
          }

          const titulo = renderTemplate(lembrete.titulo_template, vars);
          const corpo = renderTemplate(lembrete.corpo_template, vars);
          const notifId = await this.notifyUser({
            id_usuario: idUsuario,
            titulo,
            corpo,
            deep_link: `/inscricoes?edital=${etapa.id_edital}`,
            origem: OrigemNotificacao.AUTOMATICO_CRONOGRAMA,
            id_edital: etapa.id_edital,
            oficial: true,
          });

          await this.disparoRepo.save(
            this.disparoRepo.create({
              id_lembrete: lembrete.id,
              id_etapa: etapa.id,
              id_usuario: idUsuario,
              id_notificacao: notifId,
              chave,
            }),
          );
          disparos += 1;
        }
      }

      lembrete.ultimo_processamento_em = now;
      await this.lembreteRepo.save(lembrete);
    }

    return { processed, disparos, skipped };
  }

  private async findEtapasForLembrete(
    lembrete: LembreteNotificacao,
  ): Promise<CronogramaEtapa[]> {
    if (lembrete.tipo === TipoLembreteNotificacao.MATRICULA_PRAZO) {
      return this.etapaRepo.find({
        where: {
          ...(lembrete.id_edital != null
            ? { id_edital: lembrete.id_edital }
            : {}),
          tipo: TipoEtapaCronograma.MATRICULA,
        },
      });
    }

    return this.etapaRepo.find({
      where:
        lembrete.id_edital != null
          ? { id_edital: lembrete.id_edital }
          : {},
    });
  }
}
