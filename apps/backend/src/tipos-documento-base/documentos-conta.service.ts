import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BACKEND_UPLOAD_MAX_BYTES } from '@repo/types';
import { DocumentoConta } from './entities/documento-conta.entity';
import { TipoDocumentoBase } from './entities/tipo-documento-base.entity';

export type DocumentoContaMeta = {
  id: number;
  id_usuario: number;
  id_tipo_base: number;
  nome_arquivo: string;
  mime: string | null;
  atualizado_em: Date;
  tipo_nome: string | null;
  tipo_formatos: string[] | null;
};

@Injectable()
export class DocumentosContaService {
  constructor(
    @InjectRepository(DocumentoConta)
    private readonly docRepository: Repository<DocumentoConta>,
    @InjectRepository(TipoDocumentoBase)
    private readonly baseRepository: Repository<TipoDocumentoBase>,
  ) {}

  private async requireActiveBase(tipoBaseId: number): Promise<TipoDocumentoBase> {
    const base = await this.baseRepository.findOne({
      where: { id: tipoBaseId, ativo: true },
    });
    if (!base) {
      throw new NotFoundException(
        `Tipo base ${tipoBaseId} não encontrado ou inativo`,
      );
    }
    return base;
  }

  private toMeta(
    doc: DocumentoConta,
    base?: TipoDocumentoBase | null,
  ): DocumentoContaMeta {
    return {
      id: doc.id,
      id_usuario: doc.id_usuario,
      id_tipo_base: doc.id_tipo_base,
      nome_arquivo: doc.nome_arquivo,
      mime: doc.mime ?? null,
      atualizado_em: doc.atualizado_em,
      tipo_nome: base?.nome ?? doc.tipoBase?.nome ?? null,
      tipo_formatos: base?.formatos ?? doc.tipoBase?.formatos ?? null,
    };
  }

  async listForUser(userId: number): Promise<{ documentos: DocumentoContaMeta[] }> {
    const docs = await this.docRepository.find({
      where: { id_usuario: userId },
      relations: ['tipoBase'],
      order: { id_tipo_base: 'ASC', id: 'ASC' },
    });
    return {
      documentos: docs.map((d) => this.toMeta(d, d.tipoBase)),
    };
  }

  async upsert(
    userId: number,
    tipoBaseId: number,
    file?: Express.Multer.File,
  ): Promise<DocumentoContaMeta> {
    const base = await this.requireActiveBase(tipoBaseId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('arquivo é obrigatório');
    }
    if (file.size > (base.tamanho_max_bytes || BACKEND_UPLOAD_MAX_BYTES)) {
      throw new BadRequestException(
        `arquivo excede o tamanho máximo do tipo (${base.tamanho_max_bytes} bytes)`,
      );
    }
    if (file.size > BACKEND_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(
        `arquivo excede o limite do backend (${BACKEND_UPLOAD_MAX_BYTES} bytes)`,
      );
    }

    const ext = (file.originalname?.split('.').pop() || '').toLowerCase();
    if (base.formatos?.length && ext && !base.formatos.includes(ext)) {
      throw new BadRequestException(
        `formato .${ext} não aceite; permitidos: ${base.formatos.join(', ')}`,
      );
    }

    let doc = await this.docRepository.findOne({
      where: { id_usuario: userId, id_tipo_base: tipoBaseId },
    });

    if (doc) {
      doc.nome_arquivo = file.originalname || 'documento';
      doc.mime = file.mimetype || 'application/octet-stream';
      doc.arquivo = file.buffer;
      await this.docRepository.save(doc);
    } else {
      doc = await this.docRepository.save(
        this.docRepository.create({
          nome_arquivo: file.originalname || 'documento',
          mime: file.mimetype || 'application/octet-stream',
          arquivo: file.buffer,
          id_usuario: userId,
          id_tipo_base: tipoBaseId,
        }),
      );
    }

    const saved = await this.docRepository.findOne({
      where: { id: doc.id },
      relations: ['tipoBase'],
    });
    return this.toMeta(saved!, base);
  }

  async download(
    userId: number,
    tipoBaseId: number,
  ): Promise<{ file: StreamableFile; nome: string; mime: string }> {
    const doc = await this.docRepository
      .createQueryBuilder('d')
      .addSelect('d.arquivo')
      .where('d.id_usuario = :userId AND d.id_tipo_base = :tipoBaseId', {
        userId,
        tipoBaseId,
      })
      .getOne();
    if (!doc?.arquivo) {
      throw new NotFoundException(
        `Documento da conta para tipo ${tipoBaseId} não encontrado`,
      );
    }
    const nome = doc.nome_arquivo || 'documento';
    const mime = doc.mime || 'application/octet-stream';
    return {
      file: new StreamableFile(doc.arquivo, {
        type: mime,
        disposition: `attachment; filename="${nome}"`,
      }),
      nome,
      mime,
    };
  }

  async remove(userId: number, tipoBaseId: number): Promise<DocumentoContaMeta> {
    const doc = await this.docRepository.findOne({
      where: { id_usuario: userId, id_tipo_base: tipoBaseId },
      relations: ['tipoBase'],
    });
    if (!doc) {
      throw new NotFoundException(
        `Documento da conta para tipo ${tipoBaseId} não encontrado`,
      );
    }
    const meta = this.toMeta(doc, doc.tipoBase);
    await this.docRepository.delete({ id: doc.id });
    return meta;
  }

  /** W19: load Conta binary for immutable snapshot into inscrição Documentos. */
  async loadArquivoOwned(
    userId: number,
    documentoContaId: number,
  ): Promise<{
    id: number;
    id_usuario: number;
    id_tipo_base: number;
    nome_arquivo: string;
    mime: string | null;
    arquivo: Buffer;
    tipo_nome: string | null;
  }> {
    const doc = await this.docRepository
      .createQueryBuilder('d')
      .addSelect('d.arquivo')
      .leftJoinAndSelect('d.tipoBase', 'tb')
      .where('d.id = :id AND d.id_usuario = :userId', {
        id: documentoContaId,
        userId,
      })
      .getOne();
    if (!doc?.arquivo?.length) {
      throw new NotFoundException(
        `Documento da conta ${documentoContaId} não encontrado`,
      );
    }
    return {
      id: doc.id,
      id_usuario: doc.id_usuario,
      id_tipo_base: doc.id_tipo_base,
      nome_arquivo: doc.nome_arquivo,
      mime: doc.mime ?? null,
      arquivo: Buffer.from(doc.arquivo),
      tipo_nome: doc.tipoBase?.nome ?? null,
    };
  }

  /** W19: mirror inscrição upload into Meus Dados (same-account upsert). */
  async upsertFromBuffer(
    userId: number,
    tipoBaseId: number,
    input: { nome_arquivo: string; mime?: string | null; arquivo: Buffer },
  ): Promise<DocumentoContaMeta> {
    return this.upsert(userId, tipoBaseId, {
      buffer: input.arquivo,
      size: input.arquivo.length,
      originalname: input.nome_arquivo,
      mimetype: input.mime || 'application/octet-stream',
    } as Express.Multer.File);
  }
}
