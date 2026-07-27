import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusDocumento } from '@repo/types';
import { Documento } from './entities/documento.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Injectable()
export class DocumentosService {
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
  ) {}

  async findAll(): Promise<Documento[]> {
    return this.documentoRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Documento> {
    const documento = await this.documentoRepository.findOne({
      where: { id },
      relations: { candidatura: true },
    });
    if (!documento)
      throw new NotFoundException(`Documento ${id} não encontrado`);
    return documento;
  }

  async findByCandidatura(idCandidatura: number): Promise<Documento[]> {
    return this.documentoRepository.find({
      where: { id_candidatura: idCandidatura },
      order: { id: 'ASC' },
    });
  }

  /**
   * Upload multipart (PWA). Binary is stored; list/get keep arquivo select:false.
   */
  async create(input: {
    id_candidatura: number;
    tipo_documento: string;
    nome_arquivo: string;
    arquivo: Buffer;
  }): Promise<Documento> {
    if (!input.id_candidatura || Number.isNaN(input.id_candidatura)) {
      throw new BadRequestException('id_candidatura é obrigatório');
    }
    if (!input.tipo_documento?.trim()) {
      throw new BadRequestException('tipo_documento é obrigatório');
    }
    if (!input.arquivo?.length) {
      throw new BadRequestException('arquivo é obrigatório');
    }
    if (input.arquivo.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('arquivo excede 5MB');
    }

    const doc = this.documentoRepository.create({
      tipo_documento: input.tipo_documento.trim(),
      nome_arquivo: input.nome_arquivo || 'upload.bin',
      arquivo: input.arquivo,
      status_documento: StatusDocumento.EM_ANALISE,
      candidatura: { id: input.id_candidatura } as Candidatura,
    });

    const saved = await this.documentoRepository.save(doc);
    // Avoid returning BYTEA in the JSON response.
    const { arquivo: _arquivo, ...rest } = saved as Documento & {
      arquivo?: Buffer;
    };
    void _arquivo;
    return rest as Documento;
  }
}
