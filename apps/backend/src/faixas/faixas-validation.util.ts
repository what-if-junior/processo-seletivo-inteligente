import { BadRequestException } from '@nestjs/common';

export type FaixaWarningCode =
  | 'FAIXAS_ATIVAS_VAZIAS'
  | 'FAIXAS_COM_RESPOSTAS';

export type FaixaWarning = {
  code: FaixaWarningCode;
  message: string;
};

export type FaixaLike = {
  id?: number;
  ativo?: boolean;
  multiplicador_min?: number | null;
  multiplicador_max?: number | null;
};

/** Soft: no active bands → Rule B (baixa renda allowed; socio incomplete). */
export function buildFaixasWarnings(
  faixas: FaixaLike[],
  opts?: { hasSocioAnswers?: boolean },
): FaixaWarning[] {
  const warnings: FaixaWarning[] = [];
  const active = faixas.filter((f) => f.ativo !== false);
  if (active.length === 0) {
    warnings.push({
      code: 'FAIXAS_ATIVAS_VAZIAS',
      message:
        'Nenhuma faixa SM ativa: inscrição baixa renda permitida; bloco socioeconómico incompleto (regra B)',
    });
  }
  if (opts?.hasSocioAnswers) {
    warnings.push({
      code: 'FAIXAS_COM_RESPOSTAS',
      message:
        'Existem respostas socioeconómicas que referenciam faixas; alterações só afetam novas respostas (snapshots preservados)',
    });
  }
  return warnings;
}

export function isRegraB(faixas: FaixaLike[]): boolean {
  return faixas.filter((f) => f.ativo !== false).length === 0;
}

export function assertRotulo(rotulo: string | undefined | null): string {
  const trimmed = rotulo?.trim() ?? '';
  if (!trimmed) {
    throw new BadRequestException('rotulo é obrigatório');
  }
  return trimmed;
}

export function assertMultiplicadores(
  min: number | null | undefined,
  max: number | null | undefined,
): void {
  if (min != null && Number.isNaN(Number(min))) {
    throw new BadRequestException('multiplicador_min inválido');
  }
  if (max != null && Number.isNaN(Number(max))) {
    throw new BadRequestException('multiplicador_max inválido');
  }
  if (min != null && max != null && Number(min) > Number(max)) {
    throw new BadRequestException(
      'multiplicador_min deve ser ≤ multiplicador_max',
    );
  }
}

export function assertSalarioMinimoReferencia(value: number): number {
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new BadRequestException('salario_minimo_referencia inválido');
  }
  if (n < 0) {
    throw new BadRequestException(
      'salario_minimo_referencia deve ser ≥ 0',
    );
  }
  return n;
}
