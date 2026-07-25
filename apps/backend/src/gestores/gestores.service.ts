import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gestor } from './entities/gestor.entity';

@Injectable()
export class GestoresService {
  constructor(
    @InjectRepository(Gestor)
    private readonly gestorRepository: Repository<Gestor>,
  ) {}

  async findAll(): Promise<Gestor[]> {
    return this.gestorRepository.find({
      relations: { usuario: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Gestor> {
    const gestor = await this.gestorRepository.findOne({
      where: { id },
      relations: { usuario: true },
    });
    if (!gestor) throw new NotFoundException(`Gestor ${id} não encontrado`);
    return gestor;
  }
}
