import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtapaProcesso } from './entities/etapa-processo.entity';

@Injectable()
export class EtapasProcessoService {
  constructor(
    @InjectRepository(EtapaProcesso)
    private readonly etapaRepository: Repository<EtapaProcesso>,
  ) {}

  async findAll(): Promise<EtapaProcesso[]> {
    return this.etapaRepository.find({
      relations: { gestor: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<EtapaProcesso> {
    const etapa = await this.etapaRepository.findOne({
      where: { id },
      relations: {
        candidatura: { usuario: true, oferta: { curso: true, campus: true } },
        gestor: { usuario: true },
        recursos: true,
      },
    });
    if (!etapa) throw new NotFoundException(`Etapa ${id} não encontrada`);
    return etapa;
  }

  async findByCandidatura(idCandidatura: number): Promise<EtapaProcesso[]> {
    return this.etapaRepository.find({
      where: { id_candidatura: idCandidatura },
      relations: { gestor: true, recursos: true },
      order: { id: 'ASC' },
    });
  }
}
