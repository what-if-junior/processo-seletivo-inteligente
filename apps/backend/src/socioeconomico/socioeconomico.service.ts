import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoVagaCandidatura } from '@repo/types';
import { RespostaSocioeconomica } from './entities/resposta-socioeconomica.entity';
import { SocioeconomicoDto } from './dto/socioeconomico.dto';
import { FaixaSalarioMinimo } from '../faixas/entities/faixa-salario-minimo.entity';
import { ConfiguracaoGlobal } from '../faixas/entities/configuracao-global.entity';
import { isRegraB } from '../faixas/faixas-validation.util';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import {
  assertSocioNotSentForOtherCota,
  assertSocioPayloadForBaixaRenda,
  isBaixaRenda,
  MSG_SOCIO_FAIXA_INVALID,
} from './socioeconomico-validation.util';

const GLOBAL_ID = 1;

export type SocioEnvelope = {
  ativo: RespostaSocioeconomica | null;
  arquivados: RespostaSocioeconomica[];
  socioeconomico_incompleto: boolean;
  regra_b_socioeconomico: boolean;
};

@Injectable()
export class SocioeconomicoService {
  constructor(
    @InjectRepository(RespostaSocioeconomica)
    private readonly respostaRepository: Repository<RespostaSocioeconomica>,
    @InjectRepository(FaixaSalarioMinimo)
    private readonly faixaRepository: Repository<FaixaSalarioMinimo>,
    @InjectRepository(ConfiguracaoGlobal)
    private readonly configRepository: Repository<ConfiguracaoGlobal>,
  ) {}

  async countAnswers(faixaId?: number): Promise<number> {
    if (faixaId != null) {
      return this.respostaRepository.count({ where: { id_faixa: faixaId } });
    }
    return this.respostaRepository.count();
  }

  async hasAnyAnswers(): Promise<boolean> {
    return (await this.countAnswers()) > 0;
  }

  async findByCandidatura(idCandidatura: number): Promise<SocioEnvelope> {
    const rows = await this.respostaRepository.find({
      where: { id_candidatura: idCandidatura },
      order: { id: 'DESC' },
    });
    const ativo = rows.find((r) => !r.arquivado) ?? null;
    const arquivados = rows.filter((r) => r.arquivado);
    const faixas = await this.faixaRepository.find();
    const regraB = isRegraB(faixas);
    return {
      ativo,
      arquivados,
      socioeconomico_incompleto: Boolean(ativo?.incompleto_regra_b) || false,
      regra_b_socioeconomico: regraB,
    };
  }

  private async archiveActive(idCandidatura: number): Promise<void> {
    const active = await this.respostaRepository.find({
      where: { id_candidatura: idCandidatura, arquivado: false },
    });
    if (!active.length) return;
    const now = new Date();
    for (const row of active) {
      row.arquivado = true;
      row.arquivado_em = now;
    }
    await this.respostaRepository.save(active);
  }

  /**
   * Persist socio answer for BAIXA_RENDA (or archive when leaving that cota).
   * Called after candidatura create / tipo_vaga change.
   */
  async applyForCandidatura(
    candidatura: Candidatura,
    tipoVaga: TipoVagaCandidatura,
    dto: SocioeconomicoDto | undefined | null,
    opts?: { archivePrevious?: boolean },
  ): Promise<RespostaSocioeconomica | null> {
    assertSocioNotSentForOtherCota(tipoVaga, dto);

    if (opts?.archivePrevious) {
      await this.archiveActive(candidatura.id);
    }

    if (!isBaixaRenda(tipoVaga)) {
      return null;
    }

    const allFaixas = await this.faixaRepository.find({
      order: { ordem: 'ASC', id: 'ASC' },
    });
    const regraB = isRegraB(allFaixas);
    const payload = assertSocioPayloadForBaixaRenda(dto, regraB);

    const config =
      (await this.configRepository.findOne({ where: { id: GLOBAL_ID } })) ??
      null;
    const smRef = config?.salario_minimo_referencia ?? null;

    if (regraB) {
      // REQ-1.7 / 2.3: baixa renda allowed; socio incomplete (Documentacao_Pendente equivalent).
      const row = this.respostaRepository.create({
        numero_pessoas: null,
        id_faixa: null as unknown as undefined,
        faixa_rotulo_snapshot: null,
        faixa_multiplicador_min_snapshot: null,
        faixa_multiplicador_max_snapshot: null,
        salario_minimo_ref_snapshot: smRef,
        incompleto_regra_b: true,
        arquivado: false,
        campos_extras: payload.campos_extras ?? null,
        candidatura: { id: candidatura.id } as Candidatura,
        faixa: null,
      });
      // TypeORM JoinColumn: set relation null; id_faixa via relation.
      return this.respostaRepository.save(row);
    }

    const faixa = await this.faixaRepository.findOne({
      where: { id: Number(payload.id_faixa), ativo: true },
    });
    if (!faixa) {
      throw new BadRequestException(MSG_SOCIO_FAIXA_INVALID);
    }

    const row = this.respostaRepository.create({
      numero_pessoas: Number(payload.numero_pessoas),
      faixa_rotulo_snapshot: faixa.rotulo,
      faixa_multiplicador_min_snapshot: faixa.multiplicador_min ?? null,
      faixa_multiplicador_max_snapshot: faixa.multiplicador_max ?? null,
      salario_minimo_ref_snapshot: smRef,
      incompleto_regra_b: false,
      arquivado: false,
      campos_extras: payload.campos_extras ?? null,
      candidatura: { id: candidatura.id } as Candidatura,
      faixa: { id: faixa.id } as FaixaSalarioMinimo,
    });
    return this.respostaRepository.save(row);
  }

  async requireCandidaturaOwned(
    idCandidatura: number,
  ): Promise<Candidatura> {
    // Thin helper for controller; ownership checks stay in candidaturas layer.
    const exists = await this.respostaRepository.manager.findOne(Candidatura, {
      where: { id: idCandidatura },
    });
    if (!exists) {
      throw new NotFoundException(`Candidatura ${idCandidatura} não encontrada`);
    }
    return exists;
  }

  /** Soft signal: answers exist that snapshot a faixa (or any answers). */
  async answersExistWarning(faixaId?: number): Promise<boolean> {
    if (faixaId != null) {
      const n = await this.respostaRepository.count({
        where: { id_faixa: faixaId },
      });
      if (n > 0) return true;
    }
    // Also warn when regra-B incomplete rows exist (no faixa) — any answers.
    if (faixaId == null) {
      return this.hasAnyAnswers();
    }
    // For a specific faixa mutate: also surface if other answers exist globally.
    return this.hasAnyAnswers();
  }
}
