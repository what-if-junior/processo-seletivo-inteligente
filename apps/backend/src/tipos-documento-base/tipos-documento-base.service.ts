import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BACKEND_UPLOAD_MAX_BYTES, FaseDocumento } from '@repo/types';
import { TipoDocumentoBase } from './entities/tipo-documento-base.entity';
import { TipoDocumento } from '../tipos-documento/entities/tipo-documento.entity';
import { DocumentoConta } from './entities/documento-conta.entity';
import { CreateTipoDocumentoBaseDto } from './dto/create-tipo-documento-base.dto';
import { UpdateTipoDocumentoBaseDto } from './dto/update-tipo-documento-base.dto';
import {
  assertDeleteAllowed,
  assertFaseDocumento,
  assertNomeNonEmpty,
  assertTamanhoMaxBytes,
  normalizeFormatos,
  resolveInheritIds,
} from './tipos-documento-base-validation.util';

export type TipoDocumentoBaseResponse = TipoDocumentoBase & {
  vinculados_count: number;
  herdado?: boolean;
};

export type TiposDocumentoBaseListResponse = {
  tipos: TipoDocumentoBaseResponse[];
};

@Injectable()
export class TiposDocumentoBaseService {
  constructor(
    @InjectRepository(TipoDocumentoBase)
    private readonly baseRepository: Repository<TipoDocumentoBase>,
    @InjectRepository(TipoDocumento)
    private readonly tipoEditalRepository: Repository<TipoDocumento>,
    @InjectRepository(DocumentoConta)
    private readonly documentoContaRepository: Repository<DocumentoConta>,
  ) {}

  private async countVinculos(baseId: number): Promise<number> {
    return this.tipoEditalRepository.count({
      where: { id_tipo_base: baseId },
    });
  }

  private async toResponse(
    base: TipoDocumentoBase,
  ): Promise<TipoDocumentoBaseResponse> {
    const vinculados_count = await this.countVinculos(base.id);
    return { ...base, vinculados_count };
  }

  private async loadBase(id: number): Promise<TipoDocumentoBase> {
    const base = await this.baseRepository.findOne({ where: { id } });
    if (!base) {
      throw new NotFoundException(`Tipo base ${id} não encontrado`);
    }
    return base;
  }

  async findAllGestao(): Promise<TiposDocumentoBaseListResponse> {
    const tipos = await this.baseRepository.find({
      order: { ordem: 'ASC', id: 'ASC' },
    });
    return {
      tipos: await Promise.all(tipos.map((t) => this.toResponse(t))),
    };
  }

  async findAllAtivos(): Promise<TipoDocumentoBase[]> {
    return this.baseRepository.find({
      where: { ativo: true },
      order: { ordem: 'ASC', id: 'ASC' },
    });
  }

  async findOneGestao(id: number): Promise<TipoDocumentoBaseResponse> {
    return this.toResponse(await this.loadBase(id));
  }

  async create(
    dto: CreateTipoDocumentoBaseDto,
  ): Promise<TipoDocumentoBaseResponse> {
    const nome = assertNomeNonEmpty(dto.nome);
    const fase = assertFaseDocumento(dto.fase ?? FaseDocumento.INSCRICAO);
    const formatos = normalizeFormatos(dto.formatos);
    const tamanho_max_bytes = assertTamanhoMaxBytes(
      dto.tamanho_max_bytes ?? BACKEND_UPLOAD_MAX_BYTES,
    );

    let ordem = dto.ordem;
    if (ordem === undefined || ordem === null) {
      const last = await this.baseRepository.find({
        order: { ordem: 'DESC' },
        take: 1,
      });
      ordem = (last[0]?.ordem ?? 0) + 1;
    }

    const saved = await this.baseRepository.save(
      this.baseRepository.create({
        nome,
        descricao: dto.descricao ?? null,
        obrigatorio: dto.obrigatorio ?? true,
        formatos,
        tamanho_max_bytes,
        fase,
        ordem,
        ativo: dto.ativo ?? true,
      }),
    );
    return this.findOneGestao(saved.id);
  }

  async update(
    id: number,
    dto: UpdateTipoDocumentoBaseDto,
  ): Promise<TipoDocumentoBaseResponse> {
    const base = await this.loadBase(id);

    if (dto.nome !== undefined) {
      base.nome = assertNomeNonEmpty(dto.nome);
    }
    if (dto.descricao !== undefined) {
      base.descricao = dto.descricao;
    }
    if (dto.obrigatorio !== undefined) {
      base.obrigatorio = dto.obrigatorio;
    }
    if (dto.formatos !== undefined) {
      base.formatos = normalizeFormatos(dto.formatos);
    }
    if (dto.tamanho_max_bytes !== undefined) {
      base.tamanho_max_bytes = assertTamanhoMaxBytes(dto.tamanho_max_bytes);
    }
    if (dto.fase !== undefined) {
      base.fase = assertFaseDocumento(dto.fase);
    }
    if (dto.ordem !== undefined) {
      base.ordem = dto.ordem;
    }
    if (dto.ativo !== undefined) {
      base.ativo = dto.ativo;
    }

    await this.baseRepository.save(base);
    return this.findOneGestao(id);
  }

  async remove(id: number): Promise<TipoDocumentoBaseResponse> {
    const base = await this.loadBase(id);
    const vinculados_count = await this.countVinculos(id);
    assertDeleteAllowed(vinculados_count, id);

    // Also block if candidate Meus Dados files exist for this type.
    const docsCount = await this.documentoContaRepository.count({
      where: { id_tipo_base: id },
    });
    if (docsCount > 0) {
      assertDeleteAllowed(docsCount, id);
    }

    await this.baseRepository.delete({ id });
    return { ...base, vinculados_count: 0 };
  }

  async uploadTemplate(
    id: number,
    file?: Express.Multer.File,
  ): Promise<TipoDocumentoBaseResponse> {
    const base = await this.loadBase(id);
    if (!file?.buffer?.length) {
      throw new BadRequestException('arquivo do template é obrigatório');
    }
    if (file.size > BACKEND_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(
        `template excede o limite do backend (${BACKEND_UPLOAD_MAX_BYTES} bytes)`,
      );
    }
    base.template_nome = file.originalname || 'template';
    base.template_mime = file.mimetype || 'application/octet-stream';
    base.template_arquivo = file.buffer;
    await this.baseRepository.save(base);
    return this.findOneGestao(id);
  }

  async downloadTemplate(
    id: number,
  ): Promise<{ file: StreamableFile; nome: string; mime: string }> {
    const base = await this.baseRepository
      .createQueryBuilder('t')
      .addSelect('t.template_arquivo')
      .where('t.id = :id', { id })
      .getOne();
    if (!base) {
      throw new NotFoundException(`Tipo base ${id} não encontrado`);
    }
    if (!base.template_arquivo) {
      throw new NotFoundException('Template não cadastrado para este tipo base');
    }
    const nome = base.template_nome || 'template';
    const mime = base.template_mime || 'application/octet-stream';
    return {
      file: new StreamableFile(base.template_arquivo, {
        type: mime,
        disposition: `attachment; filename="${nome}"`,
      }),
      nome,
      mime,
    };
  }

  /**
   * Copy selected (or all active) base types into a new edital as TiposDocumento
   * with id_tipo_base set. Templates are copied when present.
   */
  async inheritIntoEdital(
    editalId: number,
    tiposBaseIds?: number[] | null,
  ): Promise<TipoDocumento[]> {
    const active = await this.findAllAtivos();
    const activeIds = active.map((b) => b.id);
    const selectedIds = resolveInheritIds(tiposBaseIds, activeIds);
    if (selectedIds.length === 0) {
      return [];
    }

    const selected = active.filter((b) => selectedIds.includes(b.id));
    // Load templates for copy (select:false by default).
    const withTemplates = await this.baseRepository
      .createQueryBuilder('t')
      .addSelect('t.template_arquivo')
      .where('t.id IN (:...ids)', { ids: selectedIds })
      .getMany();
    const templateById = new Map(withTemplates.map((t) => [t.id, t]));

    const created: TipoDocumento[] = [];
    for (const base of selected) {
      const full = templateById.get(base.id) ?? base;
      const row = this.tipoEditalRepository.create({
        nome: base.nome,
        descricao: base.descricao ?? null,
        obrigatorio: base.obrigatorio,
        formatos: [...base.formatos],
        tamanho_max_bytes: base.tamanho_max_bytes,
        fase: base.fase,
        tipo_cota: null,
        ordem: base.ordem,
        template_nome: full.template_nome ?? null,
        template_mime: full.template_mime ?? null,
        template_arquivo: full.template_arquivo ?? null,
        id_edital: editalId,
        id_tipo_base: base.id,
      });
      created.push(await this.tipoEditalRepository.save(row));
    }
    return created;
  }

  /** Mark edital tipos as herdado vs extra for UI (W12). */
  annotateHerdado<T extends { id_tipo_base?: number | null }>(
    tipos: T[],
  ): Array<T & { herdado: boolean }> {
    return tipos.map((t) => ({
      ...t,
      herdado: t.id_tipo_base != null,
    }));
  }

  async findBasesByIds(ids: number[]): Promise<TipoDocumentoBase[]> {
    if (ids.length === 0) return [];
    return this.baseRepository.find({ where: { id: In(ids) } });
  }
}
