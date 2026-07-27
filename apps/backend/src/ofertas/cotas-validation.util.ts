import { BadRequestException } from '@nestjs/common';

export type CotaInput = {
  tipo_cota: string;
  vagas?: number | null;
  percentual?: number | string | null;
};

export type OfertaWarningCode =
  | 'VAGAS_TOTAL_MISMATCH'
  | 'PERCENTUAL_SUM_MISMATCH';

export type OfertaWarning = {
  code: OfertaWarningCode;
  message: string;
  vagas_totais: number;
  soma_vagas_efetivas?: number;
  soma_percentual?: number;
};

function parsePercentual(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) {
    throw new BadRequestException('percentual inválido');
  }
  return n;
}

/** Effective seats: prefer absolute `vagas`; else round(% of vagas_totais). */
export function effectiveSeatsForCota(
  cota: CotaInput,
  vagasTotais: number,
): number {
  if (cota.vagas != null) return cota.vagas;
  const p = parsePercentual(cota.percentual);
  if (p == null) return 0;
  return Math.round((p / 100) * vagasTotais);
}

export function assertCotaItemValid(cota: CotaInput, index?: number): void {
  const prefix =
    index === undefined ? 'Cota' : `Cota[${index}] (${cota.tipo_cota || '?'})`;
  if (!cota.tipo_cota?.trim()) {
    throw new BadRequestException(`${prefix}: tipo_cota é obrigatório`);
  }
  const hasVagas = cota.vagas != null;
  const p = parsePercentual(cota.percentual);
  const hasPercentual = p != null;
  if (!hasVagas && !hasPercentual) {
    throw new BadRequestException(
      `${prefix}: informe ao menos vagas ou percentual`,
    );
  }
  if (hasVagas && (cota.vagas! < 0 || !Number.isInteger(cota.vagas))) {
    throw new BadRequestException(`${prefix}: vagas deve ser inteiro ≥ 0`);
  }
  if (hasPercentual && (p! < 0 || p! > 100)) {
    throw new BadRequestException(
      `${prefix}: percentual deve estar entre 0 e 100`,
    );
  }
}

export function assertCotasBatchValid(cotas: CotaInput[]): void {
  const seen = new Set<string>();
  cotas.forEach((cota, index) => {
    assertCotaItemValid(cota, index);
    const key = cota.tipo_cota.trim().toUpperCase();
    if (seen.has(key)) {
      throw new BadRequestException(
        `tipo_cota duplicado na distribuição: ${cota.tipo_cota}`,
      );
    }
    seen.add(key);
  });
}

/**
 * Soft warnings when distribution does not close against vagas_totais /
 * 100% (REQ-3.1). Never throws.
 */
export function buildCotasWarnings(
  cotas: CotaInput[],
  vagasTotais: number,
): OfertaWarning[] {
  if (!cotas.length) return [];

  const warnings: OfertaWarning[] = [];
  let somaEfetivas = 0;
  let somaPercentual = 0;
  let purePercentual = true;

  for (const cota of cotas) {
    somaEfetivas += effectiveSeatsForCota(cota, vagasTotais);
    if (cota.vagas != null) {
      purePercentual = false;
    }
    const p = parsePercentual(cota.percentual);
    if (p != null) {
      somaPercentual += p;
    } else if (cota.vagas == null) {
      purePercentual = false;
    }
  }

  if (somaEfetivas !== vagasTotais) {
    warnings.push({
      code: 'VAGAS_TOTAL_MISMATCH',
      message: `Soma efetiva de vagas (${somaEfetivas}) difere de vagas_totais (${vagasTotais})`,
      vagas_totais: vagasTotais,
      soma_vagas_efetivas: somaEfetivas,
    });
  }

  // Pure-% mode: also warn if percentages don't sum to 100.
  if (purePercentual) {
    const rounded = Math.round(somaPercentual * 100) / 100;
    if (rounded !== 100) {
      warnings.push({
        code: 'PERCENTUAL_SUM_MISMATCH',
        message: `Soma de percentuais (${rounded}) difere de 100`,
        vagas_totais: vagasTotais,
        soma_percentual: rounded,
      });
    }
  }

  return warnings;
}
