import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrigemNotificacao,
  StatusCandidatura,
  StatusContestacao,
  TipoContestacao,
} from '@repo/types';
import { Contestacao } from './entities/contestacao.entity';
import { ContestacaoHistorico } from './entities/contestacao-historico.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import { TemplateEdital } from '../templates/entities/template-edital.entity';
import { TemplateBiblioteca } from '../templates/entities/template-biblioteca.entity';
import { TemplateTipoUso } from '../templates/template-tipo-uso';
import { Gestor } from '../gestores/entities/gestor.entity';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import {
  assertJanelaContestacaoAberta,
  computeElegibilidade,
} from './contestacoes-eligibility.util';
import {
  assertAnexoContestacao,
  assertStatusTransition,
  ERR_CANDIDATURA_INVALIDA,
  guessMimeFromNome,
} from './contestacoes-validation.util';

export type AnexoInput = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};

@Injectable()
export class ContestacoesService {
  constructor(
    @InjectRepository(Contestacao)
    private readonly contestacaoRepo: Repository<Contestacao>,
    @InjectRepository(ContestacaoHistorico)
    private readonly historicoRepo: Repository<ContestacaoHistorico>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepo: Repository<Candidatura>,
    @InjectRepository(TemplateEdital)
    private readonly templateEditalRepo: Repository<TemplateEdital>,
    @InjectRepository(TemplateBiblioteca)
    private readonly templateBibRepo: Repository<TemplateBiblioteca>,
    @InjectRepository(Gestor)
    private readonly gestorRepo: Repository<Gestor>,
    private readonly cronogramaService: CronogramaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  private stripBinary(row: Contestacao): Contestacao {
    const { arquivo_anexo: _a, ...rest } = row as Contestacao & {
      arquivo_anexo?: Buffer | null;
    };
    return rest as Contestacao;
  }

  private async etapas(editalId: number) {
    const list = await this.cronogramaService.findAllGestao(editalId);
    return list.etapas;
  }

  private async resolveInstrucao(templateId: number | null) {
    if (!templateId) return null;
    const tpl = await this.templateEditalRepo.findOne({
      where: { id: templateId },
    });
    if (!tpl) return null;
    return { id: tpl.id, titulo: tpl.titulo, corpo: tpl.corpo };
  }

  private async resolveImpugnacaoEmailTemplate(editalId: number) {
    const copias = await this.templateEditalRepo.find({
      where: {
        id_edital: editalId,
        tipo_uso: TemplateTipoUso.IMPUGNACAO_EMAIL,
      },
      order: { id: 'DESC' },
      take: 1,
    });
    const copia = copias[0];
    if (copia) {
      return {
        id: copia.id,
        titulo: copia.titulo,
        corpo: copia.corpo,
        origem: 'edital' as const,
      };
    }
    const bibs = await this.templateBibRepo.find({
      where: { tipo_uso: TemplateTipoUso.IMPUGNACAO_EMAIL, ativo: true },
      order: { id: 'ASC' },
      take: 1,
    });
    const bib = bibs[0];
    if (!bib) return null;
    return {
      id: bib.id,
      titulo: bib.titulo,
      corpo: bib.corpo,
      origem: 'biblioteca' as const,
    };
  }

  async elegibilidade(editalId: number) {
    const rows = await this.etapas(editalId);
    const base = computeElegibilidade(rows);
    const instrucao = await this.resolveInstrucao(base.template_instrucao_id);
    const mailto_template =
      await this.resolveImpugnacaoEmailTemplate(editalId);
    return { ...base, instrucao, mailto_template };
  }

  async createImpugnacao(input: {
    id_edital: number;
    texto: string;
    nome_requerente: string;
    email_requerente: string;
    anexo?: AnexoInput | null;
  }) {
    const etapas = await this.etapas(input.id_edital);
    assertJanelaContestacaoAberta(etapas, TipoContestacao.IMPUGNACAO);

    const texto = input.texto?.trim();
    const nome = input.nome_requerente?.trim();
    const email = input.email_requerente?.trim();
    if (!texto || texto.length < 3) {
      throw new BadRequestException('texto é obrigatório');
    }
    if (!nome) throw new BadRequestException('nome_requerente é obrigatório');
    if (!email) throw new BadRequestException('email_requerente é obrigatório');

    let nome_anexo: string | null = null;
    let arquivo_anexo: Buffer | null = null;
    if (input.anexo?.buffer?.length) {
      assertAnexoContestacao(
        input.anexo.buffer,
        input.anexo.originalname,
        input.anexo.mimetype,
      );
      nome_anexo = input.anexo.originalname;
      arquivo_anexo = input.anexo.buffer;
    }

    const saved = await this.contestacaoRepo.save(
      this.contestacaoRepo.create({
        tipo: TipoContestacao.IMPUGNACAO,
        status: StatusContestacao.ENVIADA,
        id_edital: input.id_edital,
        id_usuario: null,
        id_candidatura: null,
        texto,
        nome_requerente: nome,
        email_requerente: email,
        nome_anexo,
        arquivo_anexo,
      }),
    );
    return this.stripBinary(saved);
  }

  async createCandidato(input: {
    id_usuario: number;
    tipo: TipoContestacao;
    id_candidatura: number;
    texto: string;
    anexo?: AnexoInput | null;
  }) {
    if (
      input.tipo !== TipoContestacao.RECURSO &&
      input.tipo !== TipoContestacao.JUSTIFICATIVA
    ) {
      throw new BadRequestException(
        'tipo deve ser RECURSO ou JUSTIFICATIVA',
      );
    }

    const cand = await this.candidaturaRepo.findOne({
      where: { id: input.id_candidatura },
    });
    if (!cand) {
      throw new NotFoundException(
        `Candidatura ${input.id_candidatura} não encontrada`,
      );
    }
    if (Number(cand.id_usuario) !== Number(input.id_usuario)) {
      throw new ForbiddenException({
        code: ERR_CANDIDATURA_INVALIDA,
        message: 'candidatura não pertence à conta autenticada',
      });
    }
    if (cand.status === StatusCandidatura.CANCELADA) {
      throw new BadRequestException({
        code: ERR_CANDIDATURA_INVALIDA,
        message: 'candidatura cancelada não pode contestar',
      });
    }
    if (!cand.id_edital) {
      throw new BadRequestException({
        code: ERR_CANDIDATURA_INVALIDA,
        message: 'candidatura sem edital',
      });
    }

    const etapas = await this.etapas(cand.id_edital);
    assertJanelaContestacaoAberta(etapas, input.tipo);

    const texto = input.texto?.trim();
    if (!texto || texto.length < 3) {
      throw new BadRequestException('texto é obrigatório');
    }

    let nome_anexo: string | null = null;
    let arquivo_anexo: Buffer | null = null;
    if (input.anexo?.buffer?.length) {
      assertAnexoContestacao(
        input.anexo.buffer,
        input.anexo.originalname,
        input.anexo.mimetype,
      );
      nome_anexo = input.anexo.originalname;
      arquivo_anexo = input.anexo.buffer;
    }

    const saved = await this.contestacaoRepo.save(
      this.contestacaoRepo.create({
        tipo: input.tipo,
        status: StatusContestacao.ENVIADA,
        id_edital: cand.id_edital,
        id_usuario: input.id_usuario,
        id_candidatura: cand.id,
        texto,
        nome_anexo,
        arquivo_anexo,
      }),
    );
    return this.stripBinary(saved);
  }

  async listMe(idUsuario: number) {
    const rows = await this.contestacaoRepo.find({
      where: { id_usuario: idUsuario },
      order: { criado_em: 'DESC' },
      relations: ['historico'],
    });
    return rows.map((r) => this.stripBinary(r));
  }

  async listAdmin(filters: {
    edital?: number;
    tipo?: string;
    status?: string;
  }) {
    const qb = this.contestacaoRepo
      .createQueryBuilder('c')
      .orderBy('c.criado_em', 'DESC');
    if (filters.edital) {
      qb.andWhere('c.id_edital = :edital', { edital: filters.edital });
    }
    if (filters.tipo) {
      qb.andWhere('c.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters.status) {
      qb.andWhere('c.status = :status', { status: filters.status });
    }
    const rows = await qb.getMany();
    return rows.map((r) => this.stripBinary(r));
  }

  async findOne(id: number, viewer: { id_usuario: number; isAdmin?: boolean }) {
    const row = await this.contestacaoRepo.findOne({
      where: { id },
      relations: ['historico', 'historico.templateEdital'],
    });
    if (!row) throw new NotFoundException(`Contestação ${id} não encontrada`);
    const owner =
      row.id_usuario != null &&
      Number(row.id_usuario) === Number(viewer.id_usuario);
    if (!viewer.isAdmin && !owner) {
      throw new ForbiddenException('sem permissão para esta contestação');
    }
    return this.stripBinary(row);
  }

  async patchStatus(id: number, status: StatusContestacao | string) {
    const row = await this.contestacaoRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Contestação ${id} não encontrada`);
    assertStatusTransition(row.status, status);
    row.status = status as StatusContestacao;
    const saved = await this.contestacaoRepo.save(row);
    return this.stripBinary(saved);
  }

  async getAnexo(
    id: number,
    viewer: { id_usuario: number; isAdmin?: boolean },
  ): Promise<{ buffer: Buffer; nome: string; mime: string }> {
    const row = await this.contestacaoRepo
      .createQueryBuilder('c')
      .addSelect('c.arquivo_anexo')
      .where('c.id = :id', { id })
      .getOne();
    if (!row) throw new NotFoundException(`Contestação ${id} não encontrada`);
    const owner =
      row.id_usuario != null &&
      Number(row.id_usuario) === Number(viewer.id_usuario);
    if (!viewer.isAdmin && !owner) {
      throw new ForbiddenException('sem permissão para esta contestação');
    }
    if (!row.arquivo_anexo?.length || !row.nome_anexo) {
      throw new NotFoundException('anexo não encontrado');
    }
    return {
      buffer: row.arquivo_anexo,
      nome: row.nome_anexo,
      mime: guessMimeFromNome(row.nome_anexo),
    };
  }

  private async resolveGestorId(
    idUsuario: number,
  ): Promise<number | null> {
    const g = await this.gestorRepo.findOne({
      where: { usuario: { id: idUsuario } },
      relations: ['usuario'],
    });
    if (g) return g.id;
    // Fallback: column may be readable via query
    const byCol = await this.gestorRepo
      .createQueryBuilder('g')
      .where('g.id_usuario = :uid', { uid: idUsuario })
      .getOne();
    return byCol?.id ?? null;
  }

  async responder(
    id: number,
    input: {
      id_usuario_gestor: number;
      corpo: string;
      canais: string[];
      id_template_edital?: number;
      status?: StatusContestacao | string;
    },
  ) {
    const row = await this.contestacaoRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Contestação ${id} não encontrada`);

    const corpo = input.corpo?.trim();
    if (!corpo) throw new BadRequestException('corpo é obrigatório');

    const canais = [...new Set((input.canais || []).map((c) => c.trim()))].filter(
      (c) => c === 'email' || c === 'pwa',
    );
    if (canais.length === 0) {
      throw new BadRequestException('canais deve incluir email e/ou pwa');
    }

    let idTemplate: number | null = null;
    if (input.id_template_edital) {
      const tpl = await this.templateEditalRepo.findOne({
        where: { id: input.id_template_edital },
      });
      if (!tpl) {
        throw new NotFoundException(
          `Template edital ${input.id_template_edital} não encontrado`,
        );
      }
      idTemplate = tpl.id;
    }

    if (input.status) {
      assertStatusTransition(row.status, input.status);
      row.status = input.status as StatusContestacao;
      await this.contestacaoRepo.save(row);
    } else if (row.status === StatusContestacao.ENVIADA) {
      row.status = StatusContestacao.EM_ANALISE;
      await this.contestacaoRepo.save(row);
    }

    const idGestor = await this.resolveGestorId(input.id_usuario_gestor);
    const historico: ContestacaoHistorico[] = [];
    for (const canal of canais) {
      const h = await this.historicoRepo.save(
        this.historicoRepo.create({
          id_contestacao: row.id,
          id_gestor: idGestor,
          id_template_edital: idTemplate,
          canal,
          corpo,
        }),
      );
      historico.push(h);
    }

    const notificacao_stub_ids: number[] = [];
    for (const canal of canais) {
      const stubId = await this.notifyStub(row, corpo, canal, idGestor);
      if (stubId) notificacao_stub_ids.push(stubId);
    }

    const detail = await this.findOne(id, {
      id_usuario: input.id_usuario_gestor,
      isAdmin: true,
    });
    return { ...detail, historico_criado: historico, notificacao_stub_ids };
  }

  private async notifyStub(
    contest: Contestacao,
    corpo: string,
    canal: string,
    idGestor: number | null,
  ): Promise<number | undefined> {
    if (!contest.id_usuario) return undefined;
    const canais =
      canal === 'email' ? (['email'] as const) : (['pwa'] as const);
    return this.notificacoesService.notifyUser({
      id_usuario: contest.id_usuario,
      titulo: `Resposta à contestação #${contest.id} (${canal})`,
      corpo,
      deep_link: `/minhas-contestacoes?id=${contest.id}`,
      origem: OrigemNotificacao.MANUAL,
      id_edital: contest.id_edital ?? null,
      filtro_status: String(contest.status),
      id_gestor: idGestor,
      oficial: false,
      canais: [...canais],
    });
  }
}
