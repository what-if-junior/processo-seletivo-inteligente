import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from './entities/oferta.entity';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';
import { CotaItemDto } from './dto/cota-item.dto';
import { ReplaceCotasDto } from './dto/replace-cotas.dto';
import { UpdateCotaDto } from './dto/update-cota.dto';
import { Edital } from '../editais/entities/edital.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { Campus } from '../campus/entities/campus.entity';
import { CandidaturasService } from '../candidaturas/candidaturas.service';
import { DistribuicaoCota } from '../distribuicao-cotas/entities/distribuicao-cota.entity';
import {
  assertCotaItemValid,
  assertCotasBatchValid,
  buildCotasWarnings,
  type OfertaWarning,
} from './cotas-validation.util';

export type OfertaDetailResponse = Oferta & { warnings: OfertaWarning[] };

@Injectable()
export class OfertasService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(DistribuicaoCota)
    private readonly cotasRepository: Repository<DistribuicaoCota>,
    private readonly candidaturasService: CandidaturasService,
  ) {}

  async create(dto: CreateOfertaDto): Promise<OfertaDetailResponse> {
    // FKs usam insert:false nos scalars; persistir via relations (W1-03).
    const oferta = this.ofertaRepository.create({
      turno: dto.turno,
      vagas_totais: dto.vagas_totais,
      edital: { id: dto.id_edital } as Edital,
      curso: { id: dto.id_curso } as Curso,
      campus: { id: dto.id_campus } as Campus,
    });
    const saved = await this.ofertaRepository.save(oferta);
    return this.findOneWithWarnings(saved.id);
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

  /** Catálogo público: sempre editais publicados (equiv. GET /editais). */
  async findAllPublic(opts?: {
    id_edital?: number;
    id_curso?: number;
    id_campus?: number;
    abertas?: boolean;
  }): Promise<Oferta[]> {
    return this.findAll({
      ...opts,
      abertas: opts?.abertas === true ? true : undefined,
      publicados: opts?.abertas === true ? undefined : true,
    });
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

  async findOnePublic(id: number): Promise<OfertaDetailResponse> {
    const oferta = await this.findOneWithWarnings(id);
    if (!oferta.edital?.publicado) {
      throw new NotFoundException(`Oferta com id ${id} não encontrada`);
    }
    return oferta;
  }

  async findOneWithWarnings(id: number): Promise<OfertaDetailResponse> {
    const oferta = await this.findOne(id);
    const warnings = buildCotasWarnings(
      oferta.distribuicao_cotas ?? [],
      oferta.vagas_totais,
    );
    return Object.assign(oferta, { warnings });
  }

  async findCandidaturas(id: number) {
    await this.findOne(id);
    return this.candidaturasService.findByOferta(id);
  }

  async update(id: number, dto: UpdateOfertaDto): Promise<OfertaDetailResponse> {
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
    return this.findOneWithWarnings(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.ofertaRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Oferta com id ${id} não encontrada`);
    }
  }

  async replaceCotas(
    ofertaId: number,
    dto: ReplaceCotasDto,
  ): Promise<OfertaDetailResponse> {
    await this.findOne(ofertaId);
    assertCotasBatchValid(dto.cotas ?? []);

    await this.cotasRepository.manager.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .delete()
        .from(DistribuicaoCota)
        .where('id_oferta = :id', { id: ofertaId })
        .execute();

      if (dto.cotas.length === 0) return;

      const rows = dto.cotas.map((item) =>
        em.create(DistribuicaoCota, this.toCotaEntityFields(item, ofertaId)),
      );
      await em.save(rows);
    });

    return this.findOneWithWarnings(ofertaId);
  }

  async addCota(
    ofertaId: number,
    dto: CotaItemDto,
  ): Promise<OfertaDetailResponse> {
    const oferta = await this.findOne(ofertaId);
    assertCotaItemValid(dto);

    const existing = (oferta.distribuicao_cotas ?? []).map((c) =>
      c.tipo_cota.trim().toUpperCase(),
    );
    if (existing.includes(dto.tipo_cota.trim().toUpperCase())) {
      throw new BadRequestException(
        `tipo_cota já existe nesta oferta: ${dto.tipo_cota}`,
      );
    }

    const row = this.cotasRepository.create(
      this.toCotaEntityFields(dto, ofertaId),
    );
    await this.cotasRepository.save(row);
    return this.findOneWithWarnings(ofertaId);
  }

  async updateCota(
    ofertaId: number,
    cotaId: number,
    dto: UpdateCotaDto,
  ): Promise<OfertaDetailResponse> {
    const oferta = await this.findOne(ofertaId);
    const cota = (oferta.distribuicao_cotas ?? []).find((c) => c.id === cotaId);
    if (!cota) {
      throw new NotFoundException(
        `Cota ${cotaId} não encontrada na oferta ${ofertaId}`,
      );
    }

    const merged: CotaItemDto = {
      tipo_cota: dto.tipo_cota ?? cota.tipo_cota,
      vagas: dto.vagas !== undefined ? dto.vagas : cota.vagas,
      percentual:
        dto.percentual !== undefined
          ? dto.percentual
          : cota.percentual != null
            ? Number(cota.percentual)
            : null,
    };
    assertCotaItemValid(merged);

    if (dto.tipo_cota !== undefined) {
      const clash = (oferta.distribuicao_cotas ?? []).find(
        (c) =>
          c.id !== cotaId &&
          c.tipo_cota.trim().toUpperCase() ===
            dto.tipo_cota!.trim().toUpperCase(),
      );
      if (clash) {
        throw new BadRequestException(
          `tipo_cota já existe nesta oferta: ${dto.tipo_cota}`,
        );
      }
      cota.tipo_cota = dto.tipo_cota;
    }
    if (dto.vagas !== undefined) cota.vagas = dto.vagas;
    if (dto.percentual !== undefined) {
      cota.percentual =
        dto.percentual != null ? String(dto.percentual) : null;
    }

    // Persist via relation (id_oferta insert:false).
    cota.oferta = { id: ofertaId } as Oferta;
    await this.cotasRepository.save(cota);
    return this.findOneWithWarnings(ofertaId);
  }

  async removeCota(ofertaId: number, cotaId: number): Promise<OfertaDetailResponse> {
    await this.findOne(ofertaId);
    const result = await this.cotasRepository
      .createQueryBuilder()
      .delete()
      .from(DistribuicaoCota)
      .where('id = :cotaId AND id_oferta = :ofertaId', { cotaId, ofertaId })
      .execute();
    if (!result.affected) {
      throw new NotFoundException(
        `Cota ${cotaId} não encontrada na oferta ${ofertaId}`,
      );
    }
    return this.findOneWithWarnings(ofertaId);
  }

  private toCotaEntityFields(
    item: CotaItemDto,
    ofertaId: number,
  ): Partial<DistribuicaoCota> {
    return {
      tipo_cota: item.tipo_cota.trim(),
      vagas: item.vagas ?? null,
      percentual: item.percentual != null ? String(item.percentual) : null,
      oferta: { id: ofertaId } as Oferta,
    };
  }
}
