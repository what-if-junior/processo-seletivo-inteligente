import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  FaseDocumento,
  OrigemNotificacao,
  StatusDocumento,
  TipoEtapaCronograma,
} from '@repo/types';
import { Documento } from './entities/documento.entity';
import { DocumentoAuditoria } from './entities/documento-auditoria.entity';
import { MotivoHomologacaoDocumento } from './entities/motivo-homologacao-documento.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import { Notificacao } from '../notificacoes/entities/notificacao.entity';
import { NotificacaoLeitura } from '../notificacoes/entities/notificacao-leitura.entity';
import { TipoDocumento } from '../tipos-documento/entities/tipo-documento.entity';
import { DocumentosContaService } from '../tipos-documento-base/documentos-conta.service';
import {
  assertDocumentoUpload,
  assertFaseMatriculaPermitida,
  assertPodeSubstituir,
  applySugestaoIaSemDecisao,
} from './documentos-validation.util';
import {
  matchDocumentoConta,
  normalizeDocTipoNome,
} from './documentos-reuse.util';
import { DecidirDocumentoDto } from './dto/decidir-documento.dto';
import { ReutilizarDocumentoDto } from './dto/reutilizar-documento.dto';

export type UploadDocumentoInput = {
  id_candidatura: number;
  tipo_documento: string;
  nome_arquivo: string;
  arquivo: Buffer;
  mime?: string | null;
  fase?: FaseDocumento | string;
  id_usuario?: number | null;
  /** When true, mirror into Meus Dados if exigência has id_tipo_base. */
  espelhar_meus_dados?: boolean;
};

export type DocumentoComEspelho = Documento & {
  espelhado_meus_dados?: boolean;
  espelhar_skip_motivo?:
    | 'flag_ausente'
    | 'sem_id_tipo_base'
    | 'sem_usuario'
    | 'erro_upsert';
};

export type ReutilizavelExigencia = {
  id_tipo_documento: number;
  nome: string;
  id_tipo_base: number | null;
  fase: string;
  obrigatorio: boolean;
  match: {
    id_documento_conta: number;
    id_tipo_base: number;
    nome_arquivo: string;
    mime: string | null;
    atualizado_em: Date | string;
    tipo_nome: string | null;
    match_by: 'id_tipo_base' | 'nome';
  } | null;
};

@Injectable()
export class DocumentosService {
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    @InjectRepository(DocumentoAuditoria)
    private readonly auditoriaRepository: Repository<DocumentoAuditoria>,
    @InjectRepository(MotivoHomologacaoDocumento)
    private readonly motivoRepository: Repository<MotivoHomologacaoDocumento>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
    @InjectRepository(Notificacao)
    private readonly notificacaoRepository: Repository<Notificacao>,
    @InjectRepository(NotificacaoLeitura)
    private readonly leituraRepository: Repository<NotificacaoLeitura>,
    @InjectRepository(TipoDocumento)
    private readonly tipoDocumentoRepository: Repository<TipoDocumento>,
    private readonly documentosContaService: DocumentosContaService,
    private readonly cronogramaService: CronogramaService,
  ) {}

  private stripBinary(doc: Documento): Documento {
    const { arquivo: _a, anexo_decisao: _b, ...rest } = doc as Documento & {
      arquivo?: Buffer;
      anexo_decisao?: Buffer;
    };
    void _a;
    void _b;
    return rest as Documento;
  }

  /** Postgres unique_violation (e.g. tipo×fase race on create/reuse). */
  private isUniqueViolation(err: unknown): boolean {
    const code =
      (err as { code?: string })?.code ??
      (err as { driverError?: { code?: string } })?.driverError?.code;
    return code === '23505';
  }

  private async audit(input: {
    id_documento: number;
    id_candidatura: number;
    acao: string;
    id_usuario?: number | null;
    id_gestor?: number | null;
    detalhe?: string | null;
  }): Promise<void> {
    await this.auditoriaRepository.save(
      this.auditoriaRepository.create({
        id_documento: input.id_documento,
        id_candidatura: input.id_candidatura,
        acao: input.acao,
        id_usuario: input.id_usuario ?? null,
        id_gestor: input.id_gestor ?? null,
        detalhe: input.detalhe ?? null,
      }),
    );
  }

  private async loadCandidatura(id: number): Promise<Candidatura> {
    const candidatura = await this.candidaturaRepository.findOne({
      where: { id },
      relations: { usuario: true },
    });
    if (!candidatura) {
      throw new NotFoundException(`Candidatura ${id} não encontrada`);
    }
    return candidatura;
  }

  private assertOwnership(
    candidatura: Candidatura,
    idUsuario?: number | null,
  ): void {
    if (idUsuario == null || !Number.isFinite(idUsuario) || idUsuario <= 0) {
      throw new ForbiddenException(
        'autenticação obrigatória para esta operação',
      );
    }
    if (Number(candidatura.id_usuario) !== Number(idUsuario)) {
      throw new ForbiddenException(
        'candidatura não pertence à conta autenticada',
      );
    }
  }

  private async resolveTipoExigencia(
    idEdital: number,
    opts: { id_tipo_documento?: number; tipo?: string },
  ): Promise<TipoDocumento> {
    if (opts.id_tipo_documento && opts.id_tipo_documento > 0) {
      const byId = await this.tipoDocumentoRepository.findOne({
        where: { id: opts.id_tipo_documento, id_edital: idEdital },
      });
      if (!byId) {
        throw new NotFoundException(
          `Tipo de documento ${opts.id_tipo_documento} não encontrado no edital`,
        );
      }
      return byId;
    }
    const nome = opts.tipo?.trim();
    if (!nome) {
      throw new BadRequestException(
        'id_tipo_documento ou tipo é obrigatório',
      );
    }
    const tipos = await this.tipoDocumentoRepository.find({
      where: { id_edital: idEdital },
    });
    const target = normalizeDocTipoNome(nome);
    const byNome = tipos.find(
      (t) => normalizeDocTipoNome(t.nome) === target,
    );
    if (!byNome) {
      throw new NotFoundException(
        `Tipo de documento “${nome}” não encontrado no edital`,
      );
    }
    return byNome;
  }

  private async maybeEspelharMeusDados(input: {
    id_usuario?: number | null;
    id_edital: number;
    tipo_documento: string;
    nome_arquivo: string;
    arquivo: Buffer;
    mime?: string | null;
    espelhar: boolean;
  }): Promise<{
    espelhado_meus_dados: boolean;
    espelhar_skip_motivo?: DocumentoComEspelho['espelhar_skip_motivo'];
  }> {
    if (!input.espelhar) {
      return {
        espelhado_meus_dados: false,
        espelhar_skip_motivo: 'flag_ausente',
      };
    }
    if (input.id_usuario == null || input.id_usuario <= 0) {
      return {
        espelhado_meus_dados: false,
        espelhar_skip_motivo: 'sem_usuario',
      };
    }
    const tipo = await this.resolveTipoExigencia(input.id_edital, {
      tipo: input.tipo_documento,
    }).catch(() => null);
    const idTipoBase = tipo?.id_tipo_base;
    if (idTipoBase == null || Number(idTipoBase) <= 0) {
      return {
        espelhado_meus_dados: false,
        espelhar_skip_motivo: 'sem_id_tipo_base',
      };
    }
    try {
      await this.documentosContaService.upsertFromBuffer(
        input.id_usuario,
        Number(idTipoBase),
        {
          nome_arquivo: input.nome_arquivo,
          mime: input.mime,
          arquivo: input.arquivo,
        },
      );
      return { espelhado_meus_dados: true };
    } catch {
      return {
        espelhado_meus_dados: false,
        espelhar_skip_motivo: 'erro_upsert',
      };
    }
  }

  private withEspelho(
    doc: Documento,
    espelho: Awaited<ReturnType<DocumentosService['maybeEspelharMeusDados']>>,
  ): DocumentoComEspelho {
    return Object.assign(this.stripBinary(doc), espelho);
  }

  /**
   * Upload/replace allowed when:
   * - INSCRICAO fase: Inscrição OR Homologação window open
   * - MATRICULA fase: Matrícula window open
   */
  private async assertJanelaUploadAberta(
    idEdital: number,
    fase: FaseDocumento | string,
  ): Promise<void> {
    if (fase === FaseDocumento.MATRICULA) {
      const janela = await this.cronogramaService.getJanelaPorTipo(
        idEdital,
        TipoEtapaCronograma.MATRICULA,
      );
      if (!janela.aberta) {
        throw new ForbiddenException(
          'janela de matrícula fechada para envio/substituição',
        );
      }
      return;
    }

    const [inscricao, homologacao] = await Promise.all([
      this.cronogramaService.getJanelaPorTipo(
        idEdital,
        TipoEtapaCronograma.INSCRICAO,
      ),
      this.cronogramaService.getJanelaPorTipo(
        idEdital,
        TipoEtapaCronograma.HOMOLOGACAO,
      ),
    ]);
    if (!inscricao.aberta && !homologacao.aberta) {
      throw new ForbiddenException(
        'janela de documentação fechada para envio/substituição',
      );
    }
  }

  async findAll(): Promise<Documento[]> {
    return this.documentoRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Documento> {
    const documento = await this.documentoRepository.findOne({
      where: { id },
      relations: { candidatura: true, motivo: true },
    });
    if (!documento)
      throw new NotFoundException(`Documento ${id} não encontrado`);
    return documento;
  }

  async findByCandidatura(idCandidatura: number): Promise<Documento[]> {
    return this.documentoRepository.find({
      where: { id_candidatura: idCandidatura },
      relations: { motivo: true },
      order: { id: 'ASC' },
    });
  }

  async listMotivos(ativosOnly = true): Promise<MotivoHomologacaoDocumento[]> {
    return this.motivoRepository.find({
      where: ativosOnly ? { ativo: true } : {},
      order: { id: 'ASC' },
    });
  }

  async listFila(filters: {
    edital?: number;
    status?: string;
    fase?: string;
  }): Promise<Documento[]> {
    const qb = this.documentoRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.candidatura', 'c')
      .leftJoinAndSelect('c.usuario', 'u')
      .leftJoinAndSelect('c.oferta', 'o')
      .leftJoinAndSelect('o.curso', 'curso')
      .leftJoinAndSelect('o.campus', 'campus')
      .leftJoinAndSelect('d.motivo', 'm')
      .orderBy('d.id', 'ASC');

    if (filters.edital) {
      qb.andWhere('c.id_edital = :edital', { edital: filters.edital });
    }
    if (filters.status && filters.status !== "all") {
      qb.andWhere('d.status_documento = :status', { status: filters.status });
    } else if (!filters.status) {
      qb.andWhere('d.status_documento = :status', {
        status: StatusDocumento.EM_ANALISE,
      });
    }
    if (filters.fase) {
      qb.andWhere('d.fase = :fase', { fase: filters.fase });
    }
    return qb.getMany();
  }

  async create(input: UploadDocumentoInput): Promise<DocumentoComEspelho> {
    if (!input.id_candidatura || Number.isNaN(input.id_candidatura)) {
      throw new BadRequestException('id_candidatura é obrigatório');
    }
    if (!input.tipo_documento?.trim()) {
      throw new BadRequestException('tipo_documento é obrigatório');
    }

    const { mime } = assertDocumentoUpload(
      input.arquivo,
      input.nome_arquivo,
      input.mime,
    );
    const fase = (input.fase as FaseDocumento) || FaseDocumento.INSCRICAO;
    const candidatura = await this.loadCandidatura(input.id_candidatura);
    this.assertOwnership(candidatura, input.id_usuario);
    assertFaseMatriculaPermitida(candidatura.status, fase);
    await this.assertJanelaUploadAberta(candidatura.id_edital, fase);

    const existing = await this.documentoRepository.findOne({
      where: {
        id_candidatura: input.id_candidatura,
        tipo_documento: input.tipo_documento.trim(),
        fase,
      },
    });

    if (existing) {
      return this.replace(existing.id, {
        nome_arquivo: input.nome_arquivo,
        arquivo: input.arquivo,
        mime,
        id_usuario: input.id_usuario,
        espelhar_meus_dados: input.espelhar_meus_dados,
      });
    }

    const doc = this.documentoRepository.create({
      id_candidatura: input.id_candidatura,
      tipo_documento: input.tipo_documento.trim(),
      nome_arquivo: input.nome_arquivo || 'upload.bin',
      arquivo: input.arquivo,
      mime,
      fase,
      status_documento: StatusDocumento.EM_ANALISE,
      candidatura: { id: input.id_candidatura } as Candidatura,
    });

    let saved: Documento;
    try {
      saved = await this.documentoRepository.save(doc);
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
      const raced = await this.documentoRepository.findOne({
        where: {
          id_candidatura: input.id_candidatura,
          tipo_documento: input.tipo_documento.trim(),
          fase,
        },
      });
      if (!raced) throw err;
      return this.replace(raced.id, {
        nome_arquivo: input.nome_arquivo,
        arquivo: input.arquivo,
        mime,
        id_usuario: input.id_usuario,
        espelhar_meus_dados: input.espelhar_meus_dados,
      });
    }
    await this.audit({
      id_documento: saved.id,
      id_candidatura: input.id_candidatura,
      acao: 'upload',
      id_usuario: input.id_usuario ?? null,
      detalhe: `mime=${mime}; bytes=${input.arquivo.length}`,
    });

    const espelho = await this.maybeEspelharMeusDados({
      id_usuario: input.id_usuario,
      id_edital: candidatura.id_edital,
      tipo_documento: input.tipo_documento.trim(),
      nome_arquivo: input.nome_arquivo || 'upload.bin',
      arquivo: input.arquivo,
      mime,
      espelhar: Boolean(input.espelhar_meus_dados),
    });
    return this.withEspelho(saved, espelho);
  }

  async replace(
    id: number,
    input: {
      nome_arquivo: string;
      arquivo: Buffer;
      mime?: string | null;
      id_usuario?: number | null;
      espelhar_meus_dados?: boolean;
    },
  ): Promise<DocumentoComEspelho> {
    const doc = await this.documentoRepository
      .createQueryBuilder('d')
      .addSelect('d.arquivo')
      .leftJoinAndSelect('d.candidatura', 'c')
      .where('d.id = :id', { id })
      .getOne();
    if (!doc) throw new NotFoundException(`Documento ${id} não encontrado`);

    assertPodeSubstituir(doc.status_documento);
    const candidatura =
      doc.candidatura ?? (await this.loadCandidatura(doc.id_candidatura));
    this.assertOwnership(candidatura, input.id_usuario);
    assertFaseMatriculaPermitida(candidatura.status, doc.fase);
    await this.assertJanelaUploadAberta(candidatura.id_edital, doc.fase);

    const { mime } = assertDocumentoUpload(
      input.arquivo,
      input.nome_arquivo,
      input.mime,
    );

    const previousStatus = doc.status_documento;
    doc.arquivo = input.arquivo;
    doc.nome_arquivo = input.nome_arquivo || doc.nome_arquivo;
    doc.mime = mime;
    doc.status_documento = StatusDocumento.EM_ANALISE;
    doc.id_motivo = null;
    doc.motivo_livre = null;
    doc.decidido_em = null;
    doc.id_gestor_decisao = null;
    doc.sugestao_ia = null;

    const saved = await this.documentoRepository.save(doc);
    await this.audit({
      id_documento: saved.id,
      id_candidatura: saved.id_candidatura,
      acao: 'replace',
      id_usuario: input.id_usuario ?? null,
      detalhe: `from_status=${previousStatus}; mime=${mime}; bytes=${input.arquivo.length}`,
    });

    const espelho = await this.maybeEspelharMeusDados({
      id_usuario: input.id_usuario,
      id_edital: candidatura.id_edital,
      tipo_documento: saved.tipo_documento,
      nome_arquivo: saved.nome_arquivo,
      arquivo: input.arquivo,
      mime,
      espelhar: Boolean(input.espelhar_meus_dados),
    });
    return this.withEspelho(saved, espelho);
  }

  /**
   * REQ-2.6: per edital exigência, Conta match meta (or null) for same account.
   */
  async listReutilizaveis(
    idCandidatura: number,
    idUsuario: number,
  ): Promise<{ exigencias: ReutilizavelExigencia[] }> {
    if (!idCandidatura || Number.isNaN(idCandidatura)) {
      throw new BadRequestException('candidatura é obrigatório');
    }
    const candidatura = await this.loadCandidatura(idCandidatura);
    this.assertOwnership(candidatura, idUsuario);

    const tipos = await this.tipoDocumentoRepository.find({
      where: { id_edital: candidatura.id_edital },
      order: { ordem: 'ASC', id: 'ASC' },
    });
    const { documentos: contaDocs } =
      await this.documentosContaService.listForUser(idUsuario);
    const candidates = contaDocs.map((d) => ({
      id: d.id,
      id_tipo_base: d.id_tipo_base,
      tipo_nome: d.tipo_nome,
    }));

    const exigencias: ReutilizavelExigencia[] = tipos.map((t) => {
      const hit = matchDocumentoConta(
        { id_tipo_base: t.id_tipo_base, nome: t.nome },
        candidates,
      );
      const conta = hit
        ? contaDocs.find((d) => d.id === hit.id) ?? null
        : null;
      return {
        id_tipo_documento: t.id,
        nome: t.nome,
        id_tipo_base: t.id_tipo_base ?? null,
        fase: String(t.fase),
        obrigatorio: Boolean(t.obrigatorio),
        match: conta
          ? {
              id_documento_conta: conta.id,
              id_tipo_base: conta.id_tipo_base,
              nome_arquivo: conta.nome_arquivo,
              mime: conta.mime,
              atualizado_em: conta.atualizado_em,
              tipo_nome: conta.tipo_nome,
              match_by: hit!.match_by,
            }
          : null,
      };
    });

    return { exigencias };
  }

  /**
   * Confirm reuse: immutable BYTEA snapshot into inscrição Documentos (no Conta FK).
   */
  async reutilizar(
    dto: ReutilizarDocumentoDto,
    idUsuario: number,
  ): Promise<Documento> {
    const idCandidatura = Number(dto.id_candidatura);
    if (!idCandidatura || Number.isNaN(idCandidatura)) {
      throw new BadRequestException('id_candidatura é obrigatório');
    }
    const candidatura = await this.loadCandidatura(idCandidatura);
    this.assertOwnership(candidatura, idUsuario);

    const tipo = await this.resolveTipoExigencia(candidatura.id_edital, {
      id_tipo_documento: dto.id_tipo_documento
        ? Number(dto.id_tipo_documento)
        : undefined,
      tipo: dto.tipo,
    });
    // Fase comes from the edital exigência — ignore client override (wrong slot / window).
    const fase = (tipo.fase as FaseDocumento) || FaseDocumento.INSCRICAO;
    if (dto.fase != null && String(dto.fase) !== String(fase)) {
      throw new BadRequestException(
        'fase não corresponde à exigência do tipo no edital',
      );
    }

    assertFaseMatriculaPermitida(candidatura.status, fase);
    await this.assertJanelaUploadAberta(candidatura.id_edital, fase);

    const { documentos: contaDocs } =
      await this.documentosContaService.listForUser(idUsuario);
    const candidates = contaDocs.map((d) => ({
      id: d.id,
      id_tipo_base: d.id_tipo_base,
      tipo_nome: d.tipo_nome,
    }));
    const autoMatch = matchDocumentoConta(
      { id_tipo_base: tipo.id_tipo_base, nome: tipo.nome },
      candidates,
    );

    let documentoContaId = dto.id_documento_conta
      ? Number(dto.id_documento_conta)
      : autoMatch?.id;
    if (!documentoContaId) {
      throw new BadRequestException(
        'nenhum documento reutilizável correspondente em Meus Dados',
      );
    }

    if (dto.id_documento_conta) {
      const explicit = contaDocs.find((d) => d.id === documentoContaId);
      if (!explicit) {
        throw new ForbiddenException(
          'documento da conta não pertence à conta autenticada',
        );
      }
      const stillMatches = matchDocumentoConta(
        { id_tipo_base: tipo.id_tipo_base, nome: tipo.nome },
        [
          {
            id: explicit.id,
            id_tipo_base: explicit.id_tipo_base,
            tipo_nome: explicit.tipo_nome,
          },
        ],
      );
      if (!stillMatches) {
        throw new BadRequestException(
          'documento da conta não corresponde ao tipo exigido',
        );
      }
    }

    const source = await this.documentosContaService.loadArquivoOwned(
      idUsuario,
      documentoContaId,
    );
    // Defensive copy — inscrição snapshot must not share buffer refs with Conta.
    const snapshot = Buffer.from(source.arquivo);

    const { mime } = assertDocumentoUpload(
      snapshot,
      source.nome_arquivo,
      source.mime,
    );

    const existing = await this.documentoRepository.findOne({
      where: {
        id_candidatura: idCandidatura,
        tipo_documento: tipo.nome,
        fase,
      },
    });

    if (existing) {
      assertPodeSubstituir(existing.status_documento);
      const previousStatus = existing.status_documento;
      existing.arquivo = snapshot;
      existing.nome_arquivo = source.nome_arquivo;
      existing.mime = mime;
      existing.status_documento = StatusDocumento.EM_ANALISE;
      existing.id_motivo = null;
      existing.motivo_livre = null;
      existing.decidido_em = null;
      existing.id_gestor_decisao = null;
      existing.sugestao_ia = null;
      const saved = await this.documentoRepository.save(existing);
      await this.audit({
        id_documento: saved.id,
        id_candidatura: idCandidatura,
        acao: 'reuse_from_conta',
        id_usuario: idUsuario,
        detalhe: JSON.stringify({
          id_documento_conta: source.id,
          id_tipo_base: source.id_tipo_base,
          from_status: previousStatus,
          bytes: snapshot.length,
        }),
      });
      return this.stripBinary(saved);
    }

    try {
      const created = await this.documentoRepository.save(
        this.documentoRepository.create({
          id_candidatura: idCandidatura,
          tipo_documento: tipo.nome,
          nome_arquivo: source.nome_arquivo,
          arquivo: snapshot,
          mime,
          fase,
          status_documento: StatusDocumento.EM_ANALISE,
          candidatura: { id: idCandidatura } as Candidatura,
        }),
      );
      await this.audit({
        id_documento: created.id,
        id_candidatura: idCandidatura,
        acao: 'reuse_from_conta',
        id_usuario: idUsuario,
        detalhe: JSON.stringify({
          id_documento_conta: source.id,
          id_tipo_base: source.id_tipo_base,
          bytes: snapshot.length,
        }),
      });
      return this.stripBinary(created);
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
      // Concurrent reuse/upload won the insert — retry as replace of the winner.
      const raced = await this.documentoRepository.findOne({
        where: {
          id_candidatura: idCandidatura,
          tipo_documento: tipo.nome,
          fase,
        },
      });
      if (!raced) throw err;
      assertPodeSubstituir(raced.status_documento);
      const previousStatus = raced.status_documento;
      raced.arquivo = snapshot;
      raced.nome_arquivo = source.nome_arquivo;
      raced.mime = mime;
      raced.status_documento = StatusDocumento.EM_ANALISE;
      raced.id_motivo = null;
      raced.motivo_livre = null;
      raced.decidido_em = null;
      raced.id_gestor_decisao = null;
      raced.sugestao_ia = null;
      const saved = await this.documentoRepository.save(raced);
      await this.audit({
        id_documento: saved.id,
        id_candidatura: idCandidatura,
        acao: 'reuse_from_conta',
        id_usuario: idUsuario,
        detalhe: JSON.stringify({
          id_documento_conta: source.id,
          id_tipo_base: source.id_tipo_base,
          from_status: previousStatus,
          bytes: snapshot.length,
          raced: true,
        }),
      });
      return this.stripBinary(saved);
    }
  }

  async downloadArquivo(
    id: number,
  ): Promise<{ file: StreamableFile; nome: string; mime: string }> {
    const doc = await this.documentoRepository
      .createQueryBuilder('d')
      .addSelect('d.arquivo')
      .where('d.id = :id', { id })
      .getOne();
    if (!doc?.arquivo?.length) {
      throw new NotFoundException(`Arquivo do documento ${id} não encontrado`);
    }
    const mime = doc.mime || 'application/octet-stream';
    return {
      file: new StreamableFile(doc.arquivo, {
        type: mime,
        disposition: `attachment; filename="${doc.nome_arquivo}"`,
      }),
      nome: doc.nome_arquivo,
      mime,
    };
  }

  async decidir(
    id: number,
    dto: DecidirDocumentoDto,
  ): Promise<Documento & { notificacao_stub_id?: number }> {
    if (
      dto.status !== StatusDocumento.APROVADO &&
      dto.status !== StatusDocumento.REPROVADO
    ) {
      throw new BadRequestException(
        'status deve ser aprovado (homologar) ou reprovado (rejeitar)',
      );
    }

    const doc = await this.findOne(id);
    let motivo: MotivoHomologacaoDocumento | null = null;

    if (dto.status === StatusDocumento.REPROVADO) {
      if (!dto.id_motivo) {
        throw new BadRequestException(
          'id_motivo do catálogo é obrigatório para rejeição',
        );
      }
      motivo = await this.motivoRepository.findOne({
        where: { id: dto.id_motivo, ativo: true },
      });
      if (!motivo) {
        throw new BadRequestException('motivo de catálogo inválido ou inativo');
      }
      if (motivo.exige_texto_livre && !dto.motivo_livre?.trim()) {
        throw new BadRequestException(
          'motivo_livre é obrigatório para este motivo de catálogo',
        );
      }
    }

    doc.status_documento = dto.status;
    doc.motivo = motivo;
    doc.id_motivo = motivo?.id ?? null;
    doc.motivo_livre = dto.motivo_livre?.trim() || null;
    doc.decidido_em = new Date();
    doc.id_gestor_decisao = dto.id_gestor ?? null;

    const saved = await this.documentoRepository.save(doc);
    await this.audit({
      id_documento: saved.id,
      id_candidatura: saved.id_candidatura,
      acao: dto.status === StatusDocumento.APROVADO ? 'homologar' : 'rejeitar',
      id_gestor: dto.id_gestor ?? null,
      detalhe: JSON.stringify({
        id_motivo: saved.id_motivo,
        motivo_livre: saved.motivo_livre,
      }),
    });

    const notificacao_stub_id = await this.notifyStub(saved);
    return Object.assign(this.stripBinary(saved), { notificacao_stub_id });
  }

  async decidirLote(
    ids: number[],
    dto: Omit<DecidirDocumentoDto, never>,
  ): Promise<{ updated: number; ids: number[] }> {
    if (!ids?.length) {
      throw new BadRequestException('ids é obrigatório');
    }
    const unique = [...new Set(ids.map(Number).filter((n) => n > 0))];
    const results: number[] = [];
    for (const id of unique) {
      await this.decidir(id, dto);
      results.push(id);
    }
    await this.audit({
      id_documento: results[0] ?? 0,
      id_candidatura: 0,
      acao: 'batch',
      id_gestor: dto.id_gestor ?? null,
      detalhe: JSON.stringify({ ids: results, status: dto.status }),
    });
    return { updated: results.length, ids: results };
  }

  /**
   * W31 will deliver channels; W27 only persists a stub row + leitura for the candidate.
   */
  private async notifyStub(doc: Documento): Promise<number | undefined> {
    const candidatura = await this.loadCandidatura(doc.id_candidatura);
    const titulo =
      doc.status_documento === StatusDocumento.APROVADO
        ? 'Documento homologado'
        : 'Documento rejeitado — reenvie pelo aplicativo';
    const corpo =
      doc.status_documento === StatusDocumento.APROVADO
        ? `O documento “${doc.tipo_documento}” foi homologado.`
        : `O documento “${doc.tipo_documento}” foi rejeitado. Motivo: ${
            doc.motivo_livre || 'ver catálogo'
          }. Reenvio apenas pelo aplicativo enquanto a janela estiver aberta.`;

    const notificacao = await this.notificacaoRepository.save(
      this.notificacaoRepository.create({
        titulo,
        corpo,
        deep_link: `/docs?candidatura=${doc.id_candidatura}`,
        origem: OrigemNotificacao.MANUAL,
        id_edital: candidatura.id_edital,
        filtro_status: String(doc.status_documento),
        enviado_em: new Date(),
        id_gestor: doc.id_gestor_decisao ?? null,
      }),
    );

    await this.leituraRepository.save(
      this.leituraRepository.create({
        id_notificacao: notificacao.id,
        id_usuario: candidatura.id_usuario,
        notificacao: { id: notificacao.id } as Notificacao,
        usuario: {
          id: candidatura.id_usuario,
        } as import('../user/entities/user.entity').User,
        lida_em: null,
      }),
    );
    return notificacao.id;
  }

  /** Test helper surface: suggestion alone never flips status. */
  previewSugestaoIa(
    status: StatusDocumento | string,
    sugestao: string,
  ): ReturnType<typeof applySugestaoIaSemDecisao> {
    return applySugestaoIaSemDecisao({
      status_documento: status,
      sugestao_ia: sugestao,
    });
  }

  async listByIds(ids: number[]): Promise<Documento[]> {
    if (!ids.length) return [];
    return this.documentoRepository.find({
      where: { id: In(ids) },
      order: { id: 'ASC' },
    });
  }
}
