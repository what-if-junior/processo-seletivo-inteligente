import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from './entities/documento.entity';

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
}
