import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BACKEND_UPLOAD_MAX_BYTES, CampoFormularioTipo } from '@repo/types';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { TipoDocumentoCampo } from './entities/tipo-documento-campo.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';
import {
  ReplaceTipoDocumentoCamposDto,
  TipoDocumentoCampoItemDto,
} from './dto/replace-campos.dto';
import {
  assertCampoTipo,
  assertFaseDocumento,
  assertNomeNonEmpty,
  assertTamanhoMaxBytes,
  buildCatalogueChangeWarning,
  normalizeFormatos,
  type TiposDocumentoWarning,
} from './tipos-documento-validation.util';

export type TipoDocumentoResponse = TipoDocumento & {
  campos: TipoDocumentoCampo[];
  warnings: TiposDocumentoWarning[];
};

export type TiposDocumentoListResponse = {
  tipos: TipoDocumentoResponse[];
  warnings: TiposDocumentoWarning[];
};

@Injectable()
export class TiposDocumentoService {
  constructor(
    @InjectRepository(TipoDocumento)
    private readonly tipoRepository: Repository<TipoDocumento>,
    @InjectRepository(TipoDocumentoCampo)
    private readonly campoRepository: Repository<TipoDocumentoCampo>,
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
  ) {}

  private async requireEdital(editalId: number): Promise<Edital> {
    const edital = await this.editalRepository.findOne({
      where: { id: editalId },
    });
    if (!edital) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return edital;
  }

  private async countInscricoes(editalId: number): Promise<number> {
    return this.candidaturaRepository.count({ where: { id_edital: editalId } });
  }

  private async warningsFor(editalId: number): Promise<TiposDocumentoWarning[]> {
    return buildCatalogueChangeWarning(await this.countInscricoes(editalId));
  }

  private async loadTipo(
    editalId: number,
    id: number,
  ): Promise<TipoDocumento> {
    const tipo = await this.tipoRepository.findOne({
      where: { id, id_edital: editalId },
      relations: ['campos'],
    });
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de documento ${id} não encontrado no edital ${editalId}`,
      );
    }
    tipo.campos = (tipo.campos ?? []).sort(
      (a, b) => a.ordem - b.ordem || a.id - b.id,
    );
    return tipo;
  }

  private async toResponse(
    editalId: number,
    tipo: TipoDocumento,
  ): Promise<TipoDocumentoResponse> {
    return {
      ...tipo,
      campos: tipo.campos ?? [],
      warnings: await this.warningsFor(editalId),
    };
  }

  private async listRows(editalId: number): Promise<TipoDocumento[]> {
    const tipos = await this.tipoRepository.find({
      where: { id_edital: editalId },
      relations: ['campos'],
      order: { ordem: 'ASC', id: 'ASC' },
    });
    for (const t of tipos) {
      t.campos = (t.campos ?? []).sort(
        (a, b) => a.ordem - b.ordem || a.id - b.id,
      );
    }
    return tipos;
  }

  async findAllPublic(editalId: number): Promise<TiposDocumentoListResponse> {
    const edital = await this.requireEdital(editalId);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return this.findAllGestao(editalId);
  }

  async findAllGestao(editalId: number): Promise<TiposDocumentoListResponse> {
    await this.requireEdital(editalId);
    const warnings = await this.warningsFor(editalId);
    const tipos = await this.listRows(editalId);
    return {
      tipos: tipos.map((t) => ({ ...t, campos: t.campos ?? [], warnings })),
      warnings,
    };
  }

  async findOneGestao(
    editalId: number,
    id: number,
  ): Promise<TipoDocumentoResponse> {
    await this.requireEdital(editalId);
    return this.toResponse(editalId, await this.loadTipo(editalId, id));
  }

  async findOnePublic(
    editalId: number,
    id: number,
  ): Promise<TipoDocumentoResponse> {
    const edital = await this.requireEdital(editalId);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return this.findOneGestao(editalId, id);
  }

  async create(
    editalId: number,
    dto: CreateTipoDocumentoDto,
  ): Promise<TipoDocumentoResponse> {
    await this.requireEdital(editalId);
    const nome = assertNomeNonEmpty(dto.nome);
    const fase = assertFaseDocumento(dto.fase);
    const formatos = normalizeFormatos(dto.formatos);
    const tamanho_max_bytes = assertTamanhoMaxBytes(
      dto.tamanho_max_bytes ?? BACKEND_UPLOAD_MAX_BYTES,
    );
    const tipo_cota = dto.tipo_cota?.trim() || null;

    let ordem = dto.ordem;
    if (ordem === undefined || ordem === null) {
      const last = await this.tipoRepository.find({
        where: { id_edital: editalId },
        order: { ordem: 'DESC' },
        take: 1,
      });
      ordem = (last[0]?.ordem ?? 0) + 1;
    }

    const tipo = this.tipoRepository.create({
      nome,
      descricao: dto.descricao ?? null,
      obrigatorio: dto.obrigatorio ?? true,
      formatos,
      tamanho_max_bytes,
      fase,
      tipo_cota,
      ordem,
      edital: { id: editalId } as Edital,
    });
    const saved = await this.tipoRepository.save(tipo);
    return this.findOneGestao(editalId, saved.id);
  }

  async update(
    editalId: number,
    id: number,
    dto: UpdateTipoDocumentoDto,
  ): Promise<TipoDocumentoResponse> {
    await this.requireEdital(editalId);
    const tipo = await this.loadTipo(editalId, id);

    if (dto.nome !== undefined) {
      tipo.nome = assertNomeNonEmpty(dto.nome);
    }
    if (dto.descricao !== undefined) {
      tipo.descricao = dto.descricao;
    }
    if (dto.obrigatorio !== undefined) {
      tipo.obrigatorio = dto.obrigatorio;
    }
    if (dto.formatos !== undefined) {
      tipo.formatos = normalizeFormatos(dto.formatos);
    }
    if (dto.tamanho_max_bytes !== undefined) {
      tipo.tamanho_max_bytes = assertTamanhoMaxBytes(dto.tamanho_max_bytes);
    }
    if (dto.fase !== undefined) {
      tipo.fase = assertFaseDocumento(dto.fase);
    }
    if (dto.tipo_cota !== undefined) {
      tipo.tipo_cota = dto.tipo_cota?.trim() || null;
    }
    if (dto.ordem !== undefined) {
      tipo.ordem = dto.ordem;
    }

    await this.tipoRepository.save(tipo);
    return this.findOneGestao(editalId, id);
  }

  async remove(editalId: number, id: number): Promise<TipoDocumentoResponse> {
    await this.requireEdital(editalId);
    const tipo = await this.loadTipo(editalId, id);
    const warnings = await this.warningsFor(editalId);
    await this.tipoRepository.delete({ id, id_edital: editalId });
    return { ...tipo, campos: tipo.campos ?? [], warnings };
  }

  private validateCampoItem(
    item: TipoDocumentoCampoItemDto,
    index: number,
  ): {
    tipo: CampoFormularioTipo;
    rotulo: string;
    obrigatorio: boolean;
    ordem: number;
    formatos: string[] | null;
    tamanho_max_bytes: number | null;
  } {
    const tipo = assertCampoTipo(item.tipo);
    const rotulo = assertNomeNonEmpty(item.rotulo, `campos[${index}].rotulo`);
    let formatos: string[] | null = null;
    let tamanho_max_bytes: number | null = null;
    if (tipo === CampoFormularioTipo.DOCUMENTO) {
      if (item.formatos != null) {
        formatos = normalizeFormatos(item.formatos);
      }
      if (item.tamanho_max_bytes != null) {
        tamanho_max_bytes = assertTamanhoMaxBytes(
          item.tamanho_max_bytes,
          `campos[${index}].tamanho_max_bytes`,
        );
      }
    }
    return {
      tipo,
      rotulo,
      obrigatorio: item.obrigatorio ?? false,
      ordem: item.ordem ?? index + 1,
      formatos,
      tamanho_max_bytes,
    };
  }

  async replaceCampos(
    editalId: number,
    id: number,
    dto: ReplaceTipoDocumentoCamposDto,
  ): Promise<TipoDocumentoResponse> {
    await this.requireEdital(editalId);
    await this.loadTipo(editalId, id);
    if (!Array.isArray(dto.campos)) {
      throw new BadRequestException('campos deve ser um array');
    }

    const parsed = dto.campos.map((c, i) => this.validateCampoItem(c, i));

    await this.campoRepository.manager.transaction(async (em) => {
      await em.delete(TipoDocumentoCampo, { id_tipo_documento: id });
      for (const row of parsed) {
        const entity = em.create(TipoDocumentoCampo, {
          ...row,
          tipoDocumento: { id } as TipoDocumento,
        });
        await em.save(entity);
      }
    });

    return this.findOneGestao(editalId, id);
  }

  async uploadTemplate(
    editalId: number,
    id: number,
    file?: Express.Multer.File,
  ): Promise<TipoDocumentoResponse> {
    await this.requireEdital(editalId);
    const tipo = await this.loadTipo(editalId, id);
    if (!file?.buffer?.length) {
      throw new BadRequestException('arquivo do template é obrigatório');
    }
    if (file.size > BACKEND_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(
        `template excede o limite do backend (${BACKEND_UPLOAD_MAX_BYTES} bytes)`,
      );
    }
    tipo.template_nome = file.originalname || 'template';
    tipo.template_mime = file.mimetype || 'application/octet-stream';
    tipo.template_arquivo = file.buffer;
    await this.tipoRepository.save(tipo);
    return this.findOneGestao(editalId, id);
  }

  async downloadTemplate(
    editalId: number,
    id: number,
  ): Promise<{ file: StreamableFile; nome: string; mime: string }> {
    await this.requireEdital(editalId);
    const tipo = await this.tipoRepository
      .createQueryBuilder('t')
      .addSelect('t.template_arquivo')
      .where('t.id = :id AND t.id_edital = :editalId', { id, editalId })
      .getOne();
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de documento ${id} não encontrado no edital ${editalId}`,
      );
    }
    if (!tipo.template_arquivo) {
      throw new NotFoundException('Template não cadastrado para este tipo');
    }
    const nome = tipo.template_nome || 'template';
    const mime = tipo.template_mime || 'application/octet-stream';
    return {
      file: new StreamableFile(tipo.template_arquivo, {
        type: mime,
        disposition: `attachment; filename="${nome}"`,
      }),
      nome,
      mime,
    };
  }
}
