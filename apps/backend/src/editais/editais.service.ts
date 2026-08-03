import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermosModo } from '@repo/types';
import { Edital } from './entities/edital.entity';
import { EditalArquivo } from './entities/edital-arquivo.entity';
import { CreateEditalDto } from './dto/create-edital.dto';
import { UpdateEditalDto } from './dto/update-edital.dto';
import { EditalArquivoMetaDto } from './dto/edital-arquivo-meta.dto';
import {
  assertNoConflictingTermosChannels,
  assertTermosOneMode,
} from './termos.util';
import { TiposDocumentoBaseService } from '../tipos-documento-base/tipos-documento-base.service';
import { CarrosselService } from '../carrossel/carrossel.service';

const PDF_MAGIC = Buffer.from('%PDF');
const MAX_PDF_BYTES = 15 * 1024 * 1024;

export type EditalArquivoUpload = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

@Injectable()
export class EditaisService {
  constructor(
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
    @InjectRepository(EditalArquivo)
    private readonly arquivoRepository: Repository<EditalArquivo>,
    private readonly tiposDocumentoBaseService: TiposDocumentoBaseService,
    @Inject(forwardRef(() => CarrosselService))
    private readonly carrosselService: CarrosselService,
  ) {}

  async create(
    dto: CreateEditalDto,
    rawBody?: Record<string, unknown>,
  ): Promise<Edital> {
    if (rawBody) assertNoConflictingTermosChannels(rawBody);
    assertTermosOneMode(dto.termos_modo, dto.termos_valor);

    const publicado = dto.publicado ?? false;
    const inscricoes_abertas = dto.inscricoes_abertas ?? false;
    if (publicado || inscricoes_abertas) {
      throw new BadRequestException(
        'Não é possível publicar ou abrir inscrições sem PDF de edital. Crie o edital, faça POST /editais/:id/arquivos e então publique.',
      );
    }

    const edital = this.editalRepository.create({
      numero_ano: dto.numero_ano,
      metodo_selecao: dto.metodo_selecao,
      merito_tipo: dto.merito_tipo ?? null,
      is_simplificado: dto.is_simplificado ?? false,
      fallback_ac_para_rv: dto.fallback_ac_para_rv ?? false,
      termos_modo: dto.termos_modo,
      termos_valor: dto.termos_valor.trim(),
      link_oficial: dto.link_oficial ?? null,
      publicado: false,
      inscricoes_abertas: false,
    });
    const saved = await this.editalRepository.save(edital);
    // REQ-1.5: inherit account-base doc types (deselectable via tipos_base_ids).
    await this.tiposDocumentoBaseService.inheritIntoEdital(
      saved.id,
      dto.tipos_base_ids,
    );
    return saved;
  }

  async findAll(opts?: {
    publicado?: boolean;
    inscricoes_abertas?: boolean;
  }): Promise<Edital[]> {
    const where: {
      publicado?: boolean;
      inscricoes_abertas?: boolean;
    } = {};
    if (opts?.publicado !== undefined) where.publicado = opts.publicado;
    if (opts?.inscricoes_abertas !== undefined) {
      where.inscricoes_abertas = opts.inscricoes_abertas;
    }
    return this.editalRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  /** Catálogo público: só editais publicados. */
  async findAllPublic(opts?: {
    inscricoes_abertas?: boolean;
  }): Promise<Edital[]> {
    return this.findAll({
      publicado: true,
      inscricoes_abertas: opts?.inscricoes_abertas,
    });
  }

  async findOne(id: number): Promise<Edital> {
    const edital = await this.editalRepository.findOne({
      where: { id },
      relations: { ofertas: { curso: true, campus: true } },
    });
    if (!edital) {
      throw new NotFoundException(`Edital com id ${id} não encontrado`);
    }
    return edital;
  }

  /** Detalhe público: rascunhos respondem 404 (não vazam existência). */
  async findOnePublic(id: number): Promise<Edital> {
    const edital = await this.findOne(id);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital com id ${id} não encontrado`);
    }
    return edital;
  }

  async update(
    id: number,
    dto: UpdateEditalDto,
    rawBody?: Record<string, unknown>,
  ): Promise<Edital> {
    if (rawBody) assertNoConflictingTermosChannels(rawBody);

    const edital = await this.findOne(id);

    const nextModo = (dto.termos_modo ?? edital.termos_modo) as TermosModo;
    const nextValor =
      dto.termos_valor !== undefined ? dto.termos_valor : edital.termos_valor;

    if (dto.termos_modo !== undefined || dto.termos_valor !== undefined) {
      assertTermosOneMode(nextModo, nextValor);
    }

    Object.assign(edital, {
      ...dto,
      termos_modo: nextModo,
      termos_valor:
        dto.termos_valor !== undefined
          ? String(dto.termos_valor).trim()
          : edital.termos_valor,
    });

    const flagsChanged =
      dto.publicado !== undefined || dto.inscricoes_abertas !== undefined;

    const willPublish =
      edital.publicado === true || edital.inscricoes_abertas === true;
    if (willPublish) {
      assertTermosOneMode(edital.termos_modo, edital.termos_valor);
      const pdfCount = await this.arquivoRepository
        .createQueryBuilder('a')
        .where('a.id_edital = :id', { id })
        .getCount();
      if (pdfCount < 1) {
        throw new BadRequestException(
          'Publicar/abrir inscrições exige ao menos um PDF de edital (POST /editais/:id/arquivos)',
        );
      }
    }

    const saved = await this.editalRepository.save(edital);
    if (flagsChanged) {
      await this.carrosselService.syncAutoForEdital(saved);
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    const result = await this.editalRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Edital com id ${id} não encontrado`);
    }
  }

  async uploadArquivo(
    editalId: number,
    file: EditalArquivoUpload | undefined,
  ): Promise<EditalArquivoMetaDto> {
    await this.findOne(editalId);

    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Arquivo PDF obrigatório no campo multipart "arquivo"',
      );
    }
    if ((file.size ?? file.buffer.length) > MAX_PDF_BYTES) {
      throw new BadRequestException(
        `PDF excede o limite de ${MAX_PDF_BYTES} bytes`,
      );
    }
    this.assertPdfBuffer(file.buffer, file.mimetype);

    // FK via JoinColumn relation (scalar id_edital is RelationId / read-only).
    const entity = this.arquivoRepository.create({
      arquivo: file.buffer,
      edital: { id: editalId } as Edital,
    });
    const saved = await this.arquivoRepository.save(entity);
    const metas = await this.listArquivos(editalId);
    const meta = metas.find((m) => m.id === saved.id);
    if (!meta) {
      throw new NotFoundException('PDF gravado mas não encontrado no histórico');
    }
    return meta;
  }

  async listArquivos(editalId: number): Promise<EditalArquivoMetaDto[]> {
    await this.findOne(editalId);
    const rows = await this.arquivoRepository
      .createQueryBuilder('a')
      .where('a.id_edital = :editalId', { editalId })
      .orderBy('a.criado_em', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .getMany();
    if (rows.length === 0) return [];

    const vigenteId = rows[rows.length - 1].id;
    return rows.map((row) => ({
      id: row.id,
      id_edital: Number(row.id_edital),
      criado_em: row.criado_em,
      vigente: row.id === vigenteId,
    }));
  }

  /** Último PDF inserido = vigente. */
  async getVigenteArquivo(
    editalId: number,
  ): Promise<{ meta: EditalArquivoMetaDto; buffer: Buffer }> {
    await this.findOne(editalId);
    const row = await this.arquivoRepository
      .createQueryBuilder('a')
      .addSelect('a.arquivo')
      .where('a.id_edital = :editalId', { editalId })
      .orderBy('a.criado_em', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .getOne();

    if (!row) {
      throw new NotFoundException(
        `Nenhum PDF de edital para id ${editalId}`,
      );
    }

    return {
      meta: {
        id: row.id,
        id_edital: Number(row.id_edital),
        criado_em: row.criado_em,
        vigente: true,
      },
      buffer: row.arquivo,
    };
  }

  async getArquivoBuffer(
    editalId: number,
    arquivoId: number,
  ): Promise<{ meta: EditalArquivoMetaDto; buffer: Buffer }> {
    const metas = await this.listArquivos(editalId);
    const meta = metas.find((m) => m.id === arquivoId);
    if (!meta) {
      throw new NotFoundException(
        `PDF ${arquivoId} não encontrado no edital ${editalId}`,
      );
    }

    const row = await this.arquivoRepository
      .createQueryBuilder('a')
      .addSelect('a.arquivo')
      .where('a.id = :arquivoId', { arquivoId })
      .andWhere('a.id_edital = :editalId', { editalId })
      .getOne();

    if (!row?.arquivo) {
      throw new NotFoundException(
        `PDF ${arquivoId} não encontrado no edital ${editalId}`,
      );
    }

    return { meta, buffer: row.arquivo };
  }

  private assertPdfBuffer(buffer: Buffer, mimetype?: string) {
    const mimeOk =
      !mimetype ||
      mimetype === 'application/pdf' ||
      mimetype === 'application/x-pdf';
    const magicOk = buffer.subarray(0, 4).equals(PDF_MAGIC);
    if (!mimeOk || !magicOk) {
      throw new BadRequestException(
        'Arquivo deve ser PDF válido (Content-Type application/pdf e magic %PDF)',
      );
    }
  }
}
