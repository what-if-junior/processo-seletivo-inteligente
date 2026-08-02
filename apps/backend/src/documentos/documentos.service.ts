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
import {
  assertDocumentoUpload,
  assertFaseMatriculaPermitida,
  assertPodeSubstituir,
  applySugestaoIaSemDecisao,
} from './documentos-validation.util';
import { DecidirDocumentoDto } from './dto/decidir-documento.dto';

export type UploadDocumentoInput = {
  id_candidatura: number;
  tipo_documento: string;
  nome_arquivo: string;
  arquivo: Buffer;
  mime?: string | null;
  fase?: FaseDocumento | string;
  id_usuario?: number | null;
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

  async create(input: UploadDocumentoInput): Promise<Documento> {
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

    const saved = await this.documentoRepository.save(doc);
    await this.audit({
      id_documento: saved.id,
      id_candidatura: input.id_candidatura,
      acao: 'upload',
      id_usuario: input.id_usuario ?? null,
      detalhe: `mime=${mime}; bytes=${input.arquivo.length}`,
    });
    return this.stripBinary(saved);
  }

  async replace(
    id: number,
    input: {
      nome_arquivo: string;
      arquivo: Buffer;
      mime?: string | null;
      id_usuario?: number | null;
    },
  ): Promise<Documento> {
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
    return this.stripBinary(saved);
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
