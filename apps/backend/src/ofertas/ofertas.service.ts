import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from './entities/oferta.entity';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';
import { Edital } from '../editais/entities/edital.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { Campus } from '../campus/entities/campus.entity';
import { CandidaturasService } from '../candidaturas/candidaturas.service';

@Injectable()
export class OfertasService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    private readonly candidaturasService: CandidaturasService,
  ) {}

  async create(dto: CreateOfertaDto): Promise<Oferta> {
    // FKs usam insert:false nos scalars; persistir via relations (W1-03).
    const oferta = this.ofertaRepository.create({
      turno: dto.turno,
      vagas_totais: dto.vagas_totais,
      edital: { id: dto.id_edital } as Edital,
      curso: { id: dto.id_curso } as Curso,
      campus: { id: dto.id_campus } as Campus,
    });
    const saved = await this.ofertaRepository.save(oferta);
    return this.findOne(saved.id);
  }

  async findAll(opts?: {
    id_edital?: number;
    id_curso?: number;
    id_campus?: number;
    /** Quando true, só ofertas de editais publicados com inscricoes_abertas. */
    abertas?: boolean;
    /** Quando true (e abertas omitido), só editais publicados. */
    publicados?: boolean;
  }): Promise<Oferta[]> {
    const qb = this.ofertaRepository
      .createQueryBuilder('oferta')
      .leftJoinAndSelect('oferta.edital', 'edital')
      .leftJoinAndSelect('oferta.curso', 'curso')
      .leftJoinAndSelect('oferta.campus', 'campus')
      .orderBy('oferta.id', 'ASC');

    if (opts?.id_edital !== undefined) {
      qb.andWhere('oferta.id_edital = :idEdital', { idEdital: opts.id_edital });
    }
    if (opts?.id_curso !== undefined) {
      qb.andWhere('oferta.id_curso = :idCurso', { idCurso: opts.id_curso });
    }
    if (opts?.id_campus !== undefined) {
      qb.andWhere('oferta.id_campus = :idCampus', { idCampus: opts.id_campus });
    }
    if (opts?.abertas === true) {
      qb.andWhere('edital.publicado = true').andWhere(
        'edital.inscricoes_abertas = true',
      );
    } else if (opts?.publicados === true) {
      qb.andWhere('edital.publicado = true');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: {
        edital: true,
        curso: true,
        campus: true,
        distribuicao_cotas: true,
      },
    });
    if (!oferta) {
      throw new NotFoundException(`Oferta com id ${id} não encontrada`);
    }
    return oferta;
  }

  async findCandidaturas(id: number) {
    await this.findOne(id);
    return this.candidaturasService.findByOferta(id);
  }

  async update(id: number, dto: UpdateOfertaDto): Promise<Oferta> {
    const oferta = await this.findOne(id);
    if (dto.turno !== undefined) oferta.turno = dto.turno;
    if (dto.vagas_totais !== undefined) oferta.vagas_totais = dto.vagas_totais;
    if (dto.id_edital !== undefined) {
      oferta.edital = { id: dto.id_edital } as Edital;
    }
    if (dto.id_curso !== undefined) {
      oferta.curso = { id: dto.id_curso } as Curso;
    }
    if (dto.id_campus !== undefined) {
      oferta.campus = { id: dto.id_campus } as Campus;
    }
    await this.ofertaRepository.save(oferta);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.ofertaRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Oferta com id ${id} não encontrada`);
    }
  }
}
