import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusCandidatura, TipoVagaCandidatura } from '@repo/types';
import { Candidatura } from './entities/candidatura.entity';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import { User } from '../user/entities/user.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Edital } from '../editais/entities/edital.entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CandidaturasService {
  constructor(
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
  ) {}

  async findAll(): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      relations: { usuario: true, oferta: { curso: true, campus: true } },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Candidatura> {
    const candidatura = await this.candidaturaRepository.findOne({
      where: { id },
      relations: {
        usuario: true,
        oferta: { curso: true, campus: true, edital: true },
        documentos: true,
        etapas: { gestor: true, recursos: true },
      },
    });
    if (!candidatura)
      throw new NotFoundException(`Candidatura ${id} não encontrada`);
    return candidatura;
  }

  async findByOferta(idOferta: number): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      where: { id_oferta: idOferta },
      relations: { usuario: true },
      order: { id: 'ASC' },
    });
  }

  async findByUsuario(idUsuario: number): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      where: { id_usuario: idUsuario },
      relations: { oferta: { curso: true, campus: true } },
      order: { id: 'ASC' },
    });
  }

  /** RS02: uma unica candidatura ativa por usuario em cada edital. */
  async create(dto: CreateCandidaturaDto): Promise<Candidatura> {
    const duplicada = await this.candidaturaRepository.findOne({
      where: { id_usuario: dto.id_usuario, id_edital: dto.id_edital },
    });
    if (duplicada) {
      throw new ConflictException(
        `Usuário ${dto.id_usuario} já possui candidatura no edital ${dto.id_edital}`,
      );
    }

    const candidatura = this.candidaturaRepository.create({
      data_inscricao: dto.data_inscricao ?? new Date().toISOString().slice(0, 10),
      tipo_ingresso: dto.tipo_ingresso ?? null,
      tipo_vaga: dto.tipo_vaga ?? TipoVagaCandidatura.AC,
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      usuario: { id: dto.id_usuario } as User,
      oferta: { id: dto.id_oferta } as Oferta,
      edital: { id: dto.id_edital } as Edital,
    });

    try {
      return await this.candidaturaRepository.save(candidatura);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          `Usuário ${dto.id_usuario} já possui candidatura no edital ${dto.id_edital}`,
        );
      }
      throw error;
    }
  }
}
