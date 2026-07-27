import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Edital } from './entities/edital.entity';
import { CreateEditalDto } from './dto/create-edital.dto';
import { UpdateEditalDto } from './dto/update-edital.dto';

@Injectable()
export class EditaisService {
  constructor(
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
  ) {}

  async create(dto: CreateEditalDto): Promise<Edital> {
    const edital = this.editalRepository.create({
      numero_ano: dto.numero_ano,
      metodo_selecao: dto.metodo_selecao,
      merito_tipo: dto.merito_tipo ?? null,
      is_simplificado: dto.is_simplificado ?? false,
      fallback_ac_para_rv: dto.fallback_ac_para_rv ?? false,
      termos_modo: dto.termos_modo,
      termos_valor: dto.termos_valor,
      link_oficial: dto.link_oficial ?? null,
      publicado: dto.publicado ?? false,
      inscricoes_abertas: dto.inscricoes_abertas ?? false,
    });
    return this.editalRepository.save(edital);
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

  async update(id: number, dto: UpdateEditalDto): Promise<Edital> {
    const edital = await this.findOne(id);
    Object.assign(edital, dto);
    return this.editalRepository.save(edital);
  }

  async remove(id: number): Promise<void> {
    const result = await this.editalRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Edital com id ${id} não encontrado`);
    }
  }
}
