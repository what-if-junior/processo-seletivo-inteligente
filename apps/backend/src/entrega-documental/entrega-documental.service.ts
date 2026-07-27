import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoEntregaDocumental } from './entities/configuracao-entrega-documental.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Campus } from '../campus/entities/campus.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { CronogramaEtapa } from '../cronograma/entities/cronograma-etapa.entity';
import { CreateEntregaDocumentalDto } from './dto/create-entrega-documental.dto';
import { UpdateEntregaDocumentalDto } from './dto/update-entrega-documental.dto';
import {
  assertEntregaFields,
  uploadsOcultos,
} from './entrega-documental-validation.util';

export type EntregaDocumentalResponse = ConfiguracaoEntregaDocumental & {
  uploads_ocultos: boolean;
};

export type EntregaDocumentalListResponse = {
  configuracoes: EntregaDocumentalResponse[];
};

@Injectable()
export class EntregaDocumentalService {
  constructor(
    @InjectRepository(ConfiguracaoEntregaDocumental)
    private readonly entregaRepository: Repository<ConfiguracaoEntregaDocumental>,
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
    @InjectRepository(Campus)
    private readonly campusRepository: Repository<Campus>,
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
    @InjectRepository(CronogramaEtapa)
    private readonly etapaRepository: Repository<CronogramaEtapa>,
  ) {}

  private async requireEdital(editalId: number): Promise<Edital> {
    const edital = await this.editalRepository.findOne({
      where: { id: editalId },
    });
    if (!edital) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return edital;
  }

  private toResponse(
    row: ConfiguracaoEntregaDocumental,
  ): EntregaDocumentalResponse {
    return {
      ...row,
      uploads_ocultos: uploadsOcultos(row.modo),
    };
  }

  private async assertVinculo(
    editalId: number,
    idCampus: number,
    idCurso: number,
    idEtapa: number,
  ): Promise<void> {
    const campus = await this.campusRepository.findOne({
      where: { id: idCampus },
    });
    if (!campus) {
      throw new NotFoundException(`Campus ${idCampus} não encontrado`);
    }
    const curso = await this.cursoRepository.findOne({
      where: { id: idCurso },
    });
    if (!curso) {
      throw new NotFoundException(`Curso ${idCurso} não encontrado`);
    }
    const etapa = await this.etapaRepository.findOne({
      where: { id: idEtapa, id_edital: editalId },
    });
    if (!etapa) {
      throw new BadRequestException(
        `CronogramaEtapa ${idEtapa} não pertence ao edital ${editalId}`,
      );
    }
  }

  private async listRows(
    editalId: number,
  ): Promise<ConfiguracaoEntregaDocumental[]> {
    return this.entregaRepository.find({
      where: { id_edital: editalId },
      order: { id: 'ASC' },
    });
  }

  async findAllPublic(
    editalId: number,
  ): Promise<EntregaDocumentalListResponse> {
    const edital = await this.requireEdital(editalId);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return this.findAllGestao(editalId);
  }

  async findAllGestao(
    editalId: number,
  ): Promise<EntregaDocumentalListResponse> {
    await this.requireEdital(editalId);
    const rows = await this.listRows(editalId);
    return { configuracoes: rows.map((r) => this.toResponse(r)) };
  }

  async findOneGestao(
    editalId: number,
    id: number,
  ): Promise<EntregaDocumentalResponse> {
    await this.requireEdital(editalId);
    const row = await this.entregaRepository.findOne({
      where: { id, id_edital: editalId },
    });
    if (!row) {
      throw new NotFoundException(
        `Configuração de entrega ${id} não encontrada no edital ${editalId}`,
      );
    }
    return this.toResponse(row);
  }

  async findOnePublic(
    editalId: number,
    id: number,
  ): Promise<EntregaDocumentalResponse> {
    const edital = await this.requireEdital(editalId);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return this.findOneGestao(editalId, id);
  }

  async create(
    editalId: number,
    dto: CreateEntregaDocumentalDto,
  ): Promise<EntregaDocumentalResponse> {
    await this.requireEdital(editalId);
    await this.assertVinculo(
      editalId,
      dto.id_campus,
      dto.id_curso,
      dto.id_cronograma_etapa,
    );

    const fields = assertEntregaFields(dto);

    const dup = await this.entregaRepository.findOne({
      where: {
        id_edital: editalId,
        id_campus: dto.id_campus,
        id_curso: dto.id_curso,
        id_cronograma_etapa: dto.id_cronograma_etapa,
      },
    });
    if (dup) {
      throw new BadRequestException(
        'Já existe configuração de entrega para este vínculo edital/campus/curso/etapa',
      );
    }

    const entity = this.entregaRepository.create({
      ...fields,
      edital: { id: editalId } as Edital,
      campus: { id: dto.id_campus } as Campus,
      curso: { id: dto.id_curso } as Curso,
      cronogramaEtapa: { id: dto.id_cronograma_etapa } as CronogramaEtapa,
    });

    try {
      const saved = await this.entregaRepository.save(entity);
      return this.findOneGestao(editalId, saved.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('config_entrega_unique_vinculo') || msg.includes('unique')) {
        throw new BadRequestException(
          'Já existe configuração de entrega para este vínculo edital/campus/curso/etapa',
        );
      }
      throw err;
    }
  }

  async update(
    editalId: number,
    id: number,
    dto: UpdateEntregaDocumentalDto,
  ): Promise<EntregaDocumentalResponse> {
    await this.requireEdital(editalId);
    const row = await this.entregaRepository.findOne({
      where: { id, id_edital: editalId },
    });
    if (!row) {
      throw new NotFoundException(
        `Configuração de entrega ${id} não encontrada no edital ${editalId}`,
      );
    }

    const idCampus = dto.id_campus ?? row.id_campus;
    const idCurso = dto.id_curso ?? row.id_curso;
    const idEtapa = dto.id_cronograma_etapa ?? row.id_cronograma_etapa;

    if (
      dto.id_campus !== undefined ||
      dto.id_curso !== undefined ||
      dto.id_cronograma_etapa !== undefined
    ) {
      await this.assertVinculo(editalId, idCampus, idCurso, idEtapa);
      const dup = await this.entregaRepository.findOne({
        where: {
          id_edital: editalId,
          id_campus: idCampus,
          id_curso: idCurso,
          id_cronograma_etapa: idEtapa,
        },
      });
      if (dup && dup.id !== id) {
        throw new BadRequestException(
          'Já existe configuração de entrega para este vínculo edital/campus/curso/etapa',
        );
      }
    }

    const fields = assertEntregaFields({
      modo: dto.modo ?? row.modo,
      local_nome:
        dto.local_nome !== undefined ? dto.local_nome : row.local_nome,
      endereco: dto.endereco !== undefined ? dto.endereco : row.endereco,
      horario: dto.horario !== undefined ? dto.horario : row.horario,
      contactos:
        dto.contactos !== undefined ? dto.contactos : row.contactos,
      subtipo_online:
        dto.subtipo_online !== undefined
          ? dto.subtipo_online
          : row.subtipo_online,
      url_externa:
        dto.url_externa !== undefined ? dto.url_externa : row.url_externa,
      email_institucional:
        dto.email_institucional !== undefined
          ? dto.email_institucional
          : row.email_institucional,
      instrucoes:
        dto.instrucoes !== undefined ? dto.instrucoes : row.instrucoes,
    });

    Object.assign(row, fields);
    if (dto.id_campus !== undefined) {
      row.campus = { id: idCampus } as Campus;
    }
    if (dto.id_curso !== undefined) {
      row.curso = { id: idCurso } as Curso;
    }
    if (dto.id_cronograma_etapa !== undefined) {
      row.cronogramaEtapa = { id: idEtapa } as CronogramaEtapa;
    }

    await this.entregaRepository.save(row);
    return this.findOneGestao(editalId, id);
  }

  async remove(editalId: number, id: number): Promise<void> {
    await this.requireEdital(editalId);
    const result = await this.entregaRepository.delete({
      id,
      id_edital: editalId,
    });
    if (!result.affected) {
      throw new NotFoundException(
        `Configuração de entrega ${id} não encontrada no edital ${editalId}`,
      );
    }
  }
}
