import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoGlobal } from './entities/configuracao-global.entity';
import { FaixaSalarioMinimo } from './entities/faixa-salario-minimo.entity';
import { CreateFaixaDto } from './dto/create-faixa.dto';
import { UpdateFaixaDto } from './dto/update-faixa.dto';
import {
  assertMultiplicadores,
  assertRotulo,
  assertSalarioMinimoReferencia,
  buildFaixasWarnings,
  isRegraB,
  type FaixaWarning,
} from './faixas-validation.util';

export type FaixasEnvelope = {
  salario_minimo_referencia: number;
  faixas: FaixaSalarioMinimo[];
  regra_b_socioeconomico: boolean;
  warnings: FaixaWarning[];
};

export type FaixaDetailResponse = FaixaSalarioMinimo & {
  salario_minimo_referencia: number;
  regra_b_socioeconomico: boolean;
  warnings: FaixaWarning[];
};

const GLOBAL_ID = 1;
/** Temporary ordem offset to avoid unique conflicts during reorder. */
const REORDER_TEMP_BASE = 100_000;

@Injectable()
export class FaixasService {
  constructor(
    @InjectRepository(FaixaSalarioMinimo)
    private readonly faixaRepository: Repository<FaixaSalarioMinimo>,
    @InjectRepository(ConfiguracaoGlobal)
    private readonly configRepository: Repository<ConfiguracaoGlobal>,
  ) {}

  private async requireConfig(): Promise<ConfiguracaoGlobal> {
    let config = await this.configRepository.findOne({
      where: { id: GLOBAL_ID },
    });
    if (!config) {
      config = await this.configRepository.save(
        this.configRepository.create({
          id: GLOBAL_ID,
          salario_minimo_referencia: 0,
        }),
      );
    }
    return config;
  }

  private async listAll(): Promise<FaixaSalarioMinimo[]> {
    return this.faixaRepository.find({
      order: { ordem: 'ASC', id: 'ASC' },
    });
  }

  private async buildEnvelope(
    faixas: FaixaSalarioMinimo[],
    allForRegraB?: FaixaSalarioMinimo[],
  ): Promise<FaixasEnvelope> {
    const config = await this.requireConfig();
    const forRegra = allForRegraB ?? (await this.listAll());
    return {
      salario_minimo_referencia: config.salario_minimo_referencia,
      faixas,
      regra_b_socioeconomico: isRegraB(forRegra),
      warnings: buildFaixasWarnings(forRegra),
    };
  }

  async findPublic(): Promise<FaixasEnvelope> {
    const all = await this.listAll();
    const active = all.filter((f) => f.ativo);
    return this.buildEnvelope(active, all);
  }

  async findGestao(): Promise<FaixasEnvelope> {
    const all = await this.listAll();
    return this.buildEnvelope(all, all);
  }

  async findOneGestao(id: number): Promise<FaixaDetailResponse> {
    const faixa = await this.faixaRepository.findOne({ where: { id } });
    if (!faixa) {
      throw new NotFoundException(`Faixa ${id} não encontrada`);
    }
    const envelope = await this.findGestao();
    return {
      ...faixa,
      salario_minimo_referencia: envelope.salario_minimo_referencia,
      regra_b_socioeconomico: envelope.regra_b_socioeconomico,
      warnings: envelope.warnings,
    };
  }

  async updateReferencia(
    salario_minimo_referencia: number,
  ): Promise<FaixasEnvelope> {
    const value = assertSalarioMinimoReferencia(salario_minimo_referencia);
    const config = await this.requireConfig();
    config.salario_minimo_referencia = value;
    await this.configRepository.save(config);
    return this.findGestao();
  }

  async create(dto: CreateFaixaDto): Promise<FaixaDetailResponse> {
    const rotulo = assertRotulo(dto.rotulo);
    assertMultiplicadores(dto.multiplicador_min, dto.multiplicador_max);

    let ordem = dto.ordem;
    if (ordem === undefined || ordem === null) {
      const last = await this.faixaRepository.find({
        order: { ordem: 'DESC' },
        take: 1,
      });
      ordem = (last[0]?.ordem ?? 0) + 1;
    } else {
      const clash = await this.faixaRepository.findOne({ where: { ordem } });
      if (clash) {
        throw new BadRequestException(`ordem ${ordem} já está em uso`);
      }
    }

    const faixa = this.faixaRepository.create({
      rotulo,
      multiplicador_min: dto.multiplicador_min ?? null,
      multiplicador_max: dto.multiplicador_max ?? null,
      ordem,
      ativo: dto.ativo ?? true,
    });
    const saved = await this.faixaRepository.save(faixa);
    return this.findOneGestao(saved.id);
  }

  async update(id: number, dto: UpdateFaixaDto): Promise<FaixaDetailResponse> {
    const faixa = await this.faixaRepository.findOne({ where: { id } });
    if (!faixa) {
      throw new NotFoundException(`Faixa ${id} não encontrada`);
    }

    if (dto.rotulo !== undefined) {
      faixa.rotulo = assertRotulo(dto.rotulo);
    }
    if (dto.multiplicador_min !== undefined) {
      faixa.multiplicador_min = dto.multiplicador_min;
    }
    if (dto.multiplicador_max !== undefined) {
      faixa.multiplicador_max = dto.multiplicador_max;
    }
    assertMultiplicadores(faixa.multiplicador_min, faixa.multiplicador_max);

    if (dto.ordem !== undefined) {
      const clash = await this.faixaRepository.findOne({
        where: { ordem: dto.ordem },
      });
      if (clash && clash.id !== id) {
        throw new BadRequestException(`ordem ${dto.ordem} já está em uso`);
      }
      faixa.ordem = dto.ordem;
    }
    if (dto.ativo !== undefined) {
      faixa.ativo = dto.ativo;
    }

    await this.faixaRepository.save(faixa);
    return this.findOneGestao(id);
  }

  /**
   * Soft deactivate by default (preserves id/criado_em for W17 snapshots).
   * Pass hard=true to permanently delete.
   */
  async remove(id: number, hard = false): Promise<FaixasEnvelope> {
    const faixa = await this.faixaRepository.findOne({ where: { id } });
    if (!faixa) {
      throw new NotFoundException(`Faixa ${id} não encontrada`);
    }
    if (hard) {
      await this.faixaRepository.delete({ id });
    } else {
      faixa.ativo = false;
      await this.faixaRepository.save(faixa);
    }
    return this.findGestao();
  }

  async reorder(ids: number[]): Promise<FaixasEnvelope> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids deve ser um array não vazio');
    }
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException('ids contém duplicados');
    }

    const existing = await this.listAll();
    const existingIds = new Set(existing.map((f) => f.id));
    if (
      ids.length !== existing.length ||
      ids.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'ids deve listar exatamente todas as faixas',
      );
    }

    await this.faixaRepository.manager.transaction(async (em) => {
      for (let i = 0; i < ids.length; i++) {
        await em.update(
          FaixaSalarioMinimo,
          { id: ids[i] },
          { ordem: REORDER_TEMP_BASE + i },
        );
      }
      for (let i = 0; i < ids.length; i++) {
        await em.update(
          FaixaSalarioMinimo,
          { id: ids[i] },
          { ordem: i + 1 },
        );
      }
    });

    return this.findGestao();
  }
}
