import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EtapaStatusOverride,
  TipoEtapaCronograma,
} from '@repo/types';
import { CronogramaEtapa } from './entities/cronograma-etapa.entity';
import { Edital } from '../editais/entities/edital.entity';
import { CreateCronogramaEtapaDto } from './dto/create-cronograma-etapa.dto';
import { UpdateCronogramaEtapaDto } from './dto/update-cronograma-etapa.dto';
import {
  assertDatasValidas,
  buildDateOverlapWarnings,
  getJanelaInscricaoEfetiva,
  getJanelaPorTipoEfetiva,
  isEtapaEfetivamenteAberta,
  TIPO_ETAPA_DEFAULT_NOME,
  type CronogramaWarning,
  type JanelaInscricaoEfetiva,
} from './cronograma-validation.util';

export type CronogramaListResponse = {
  etapas: CronogramaEtapa[];
  warnings: CronogramaWarning[];
  janela_inscricao: JanelaInscricaoEfetiva;
};

export type CronogramaEtapaResponse = CronogramaEtapa & {
  warnings: CronogramaWarning[];
  efetivamente_aberta: boolean;
};

@Injectable()
export class CronogramaService {
  constructor(
    @InjectRepository(CronogramaEtapa)
    private readonly etapaRepository: Repository<CronogramaEtapa>,
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
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

  private async listRows(editalId: number): Promise<CronogramaEtapa[]> {
    return this.etapaRepository.find({
      where: { id_edital: editalId },
      order: { ordem: 'ASC', id: 'ASC' },
    });
  }

  private buildListPayload(etapas: CronogramaEtapa[]): CronogramaListResponse {
    return {
      etapas,
      warnings: buildDateOverlapWarnings(etapas),
      janela_inscricao: getJanelaInscricaoEfetiva(etapas),
    };
  }

  async findAllPublic(editalId: number): Promise<CronogramaListResponse> {
    const edital = await this.requireEdital(editalId);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return this.buildListPayload(await this.listRows(editalId));
  }

  async findAllGestao(editalId: number): Promise<CronogramaListResponse> {
    await this.requireEdital(editalId);
    return this.buildListPayload(await this.listRows(editalId));
  }

  async findOneGestao(
    editalId: number,
    id: number,
  ): Promise<CronogramaEtapaResponse> {
    await this.requireEdital(editalId);
    const etapa = await this.etapaRepository.findOne({
      where: { id, id_edital: editalId },
    });
    if (!etapa) {
      throw new NotFoundException(`Etapa ${id} não encontrada no edital ${editalId}`);
    }
    const all = await this.listRows(editalId);
    return {
      ...etapa,
      warnings: buildDateOverlapWarnings(all),
      efetivamente_aberta: isEtapaEfetivamenteAberta(etapa),
    };
  }

  async findOnePublic(
    editalId: number,
    id: number,
  ): Promise<CronogramaEtapaResponse> {
    const edital = await this.requireEdital(editalId);
    if (!edital.publicado) {
      throw new NotFoundException(`Edital ${editalId} não encontrado`);
    }
    return this.findOneGestao(editalId, id);
  }

  async create(
    editalId: number,
    dto: CreateCronogramaEtapaDto,
  ): Promise<CronogramaEtapaResponse> {
    await this.requireEdital(editalId);
    if (!Object.values(TipoEtapaCronograma).includes(dto.tipo)) {
      throw new BadRequestException(`tipo inválido: ${dto.tipo}`);
    }
    const { inicio, fim } = assertDatasValidas(dto.data_inicio, dto.data_fim);
    const override = dto.override ?? EtapaStatusOverride.AUTOMATICO;
    if (!Object.values(EtapaStatusOverride).includes(override)) {
      throw new BadRequestException(`override inválido: ${override}`);
    }

    let ordem = dto.ordem;
    if (ordem === undefined || ordem === null) {
      const last = await this.etapaRepository.find({
        where: { id_edital: editalId },
        order: { ordem: 'DESC' },
        take: 1,
      });
      ordem = (last[0]?.ordem ?? 0) + 1;
    }

    const nome =
      dto.nome_exibido?.trim() ||
      TIPO_ETAPA_DEFAULT_NOME[dto.tipo] ||
      dto.tipo;

    const etapa = this.etapaRepository.create({
      tipo: dto.tipo,
      nome_exibido: nome,
      data_inicio: inicio,
      data_fim: fim,
      descricao: dto.descricao ?? null,
      ordem,
      override,
      elegivel_impugnacao: dto.elegivel_impugnacao ?? false,
      elegivel_recurso: dto.elegivel_recurso ?? false,
      template_instrucao_id: dto.template_instrucao_id ?? null,
      edital: { id: editalId } as Edital,
    });
    const saved = await this.etapaRepository.save(etapa);
    return this.findOneGestao(editalId, saved.id);
  }

  async update(
    editalId: number,
    id: number,
    dto: UpdateCronogramaEtapaDto,
  ): Promise<CronogramaEtapaResponse> {
    await this.requireEdital(editalId);
    const etapa = await this.etapaRepository.findOne({
      where: { id, id_edital: editalId },
    });
    if (!etapa) {
      throw new NotFoundException(`Etapa ${id} não encontrada no edital ${editalId}`);
    }

    if (dto.tipo !== undefined) {
      if (!Object.values(TipoEtapaCronograma).includes(dto.tipo)) {
        throw new BadRequestException(`tipo inválido: ${dto.tipo}`);
      }
      etapa.tipo = dto.tipo;
    }
    if (dto.nome_exibido !== undefined) {
      etapa.nome_exibido = dto.nome_exibido.trim();
    }
    if (dto.descricao !== undefined) {
      etapa.descricao = dto.descricao;
    }
    if (dto.ordem !== undefined) {
      etapa.ordem = dto.ordem;
    }
    if (dto.override !== undefined) {
      if (!Object.values(EtapaStatusOverride).includes(dto.override)) {
        throw new BadRequestException(`override inválido: ${dto.override}`);
      }
      etapa.override = dto.override;
    }
    if (dto.elegivel_impugnacao !== undefined) {
      etapa.elegivel_impugnacao = dto.elegivel_impugnacao;
    }
    if (dto.elegivel_recurso !== undefined) {
      etapa.elegivel_recurso = dto.elegivel_recurso;
    }
    if (dto.template_instrucao_id !== undefined) {
      etapa.template_instrucao_id = dto.template_instrucao_id;
    }

    const inicio =
      dto.data_inicio !== undefined
        ? dto.data_inicio
        : etapa.data_inicio;
    const fim = dto.data_fim !== undefined ? dto.data_fim : etapa.data_fim;
    const { inicio: di, fim: df } = assertDatasValidas(inicio, fim);
    etapa.data_inicio = di;
    etapa.data_fim = df;

    await this.etapaRepository.save(etapa);
    return this.findOneGestao(editalId, id);
  }

  async remove(editalId: number, id: number): Promise<void> {
    await this.requireEdital(editalId);
    const result = await this.etapaRepository.delete({
      id,
      id_edital: editalId,
    });
    if (!result.affected) {
      throw new NotFoundException(`Etapa ${id} não encontrada no edital ${editalId}`);
    }
  }

  async reorder(
    editalId: number,
    ids: number[],
  ): Promise<CronogramaListResponse> {
    await this.requireEdital(editalId);
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids deve ser um array não vazio');
    }
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException('ids contém duplicados');
    }

    const existing = await this.listRows(editalId);
    const existingIds = new Set(existing.map((e) => e.id));
    if (ids.length !== existing.length || ids.some((id) => !existingIds.has(id))) {
      throw new BadRequestException(
        'ids deve listar exatamente todas as etapas do edital',
      );
    }

    await this.etapaRepository.manager.transaction(async (em) => {
      for (let i = 0; i < ids.length; i++) {
        await em.update(
          CronogramaEtapa,
          { id: ids[i], id_edital: editalId },
          { ordem: i + 1 },
        );
      }
    });

    return this.buildListPayload(await this.listRows(editalId));
  }

  /** Exported for W14 inscription gates. */
  async getJanelaInscricao(
    editalId: number,
    now: Date = new Date(),
  ): Promise<JanelaInscricaoEfetiva> {
    await this.requireEdital(editalId);
    return getJanelaInscricaoEfetiva(await this.listRows(editalId), now);
  }

  /** W26/W27 — window for a specific cronograma tipo. */
  async getJanelaPorTipo(
    editalId: number,
    tipo: TipoEtapaCronograma,
    now: Date = new Date(),
  ): Promise<JanelaInscricaoEfetiva> {
    await this.requireEdital(editalId);
    return getJanelaPorTipoEfetiva(await this.listRows(editalId), tipo, now);
  }
}
