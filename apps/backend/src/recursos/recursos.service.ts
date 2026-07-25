import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recurso } from './entities/recurso.entity';

@Injectable()
export class RecursosService {
  constructor(
    @InjectRepository(Recurso)
    private readonly recursoRepository: Repository<Recurso>,
  ) {}

  async findAll(): Promise<Recurso[]> {
    return this.recursoRepository.find({
      relations: { gestor: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Recurso> {
    const recurso = await this.recursoRepository.findOne({
      where: { id },
      relations: { etapa: { candidatura: true }, gestor: { usuario: true } },
    });
    if (!recurso) throw new NotFoundException(`Recurso ${id} não encontrado`);
    return recurso;
  }

  async findByEtapa(idEtapa: number): Promise<Recurso[]> {
    return this.recursoRepository.find({
      where: { id_etapa_processo: idEtapa },
      order: { id: 'ASC' },
    });
  }
}
