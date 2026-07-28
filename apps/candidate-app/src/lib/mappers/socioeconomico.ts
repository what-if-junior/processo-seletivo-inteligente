/**
 * Socioeconómico helpers (REQ-2.3 / W17).
 * Bloco ativo só para cota `renda` (BAIXA_RENDA) e quando há faixas SM ativas.
 */

export type FaixaSmPublic = {
  id: number;
  ordem: number;
  rotulo: string;
  multiplicador_min?: number | null;
  multiplicador_max?: number | null;
  ativo?: boolean;
};

export type FaixasSmPublicEnvelope = {
  salario_minimo_referencia: number;
  faixas: FaixaSmPublic[];
  regra_b_socioeconomico: boolean;
  warnings?: { code: string; message: string }[];
};

export type SocioeconomicoPayload = {
  id_faixa?: number | null;
  numero_pessoas?: number | null;
  campos_extras?: Record<string, unknown> | null;
};

export function isBaixaRendaCota(cota: string): boolean {
  return cota === "renda";
}

/** Client-side submit validation when the socio block is active (not regra B). */
export function socioWizardIssues(input: {
  cota: string;
  regraB: boolean;
  idFaixa: string;
  numeroPessoas: string;
}): string[] {
  if (!isBaixaRendaCota(input.cota) || input.regraB) return [];
  const issues: string[] = [];
  const faixaId = Number(input.idFaixa);
  if (!Number.isFinite(faixaId) || faixaId < 1) {
    issues.push("Selecione a faixa de renda familiar.");
  }
  const n = Number(input.numeroPessoas);
  if (!Number.isInteger(n) || n < 1) {
    issues.push("Informe o número de pessoas na residência (≥ 1).");
  }
  return issues;
}

export function buildSocioPayload(input: {
  cota: string;
  regraB: boolean;
  idFaixa: string;
  numeroPessoas: string;
}): SocioeconomicoPayload | undefined {
  if (!isBaixaRendaCota(input.cota)) return undefined;
  if (input.regraB) {
    return {};
  }
  return {
    id_faixa: Number(input.idFaixa),
    numero_pessoas: Number(input.numeroPessoas),
  };
}

/** PWA badge key when socio is incomplete under regra B (Documentacao_Pendente equivalente). */
export function badgeForSocioIncompleto(
  socioeconomico_incompleto: boolean | undefined,
  fallback: string,
): string {
  if (socioeconomico_incompleto) return "pendente_docs";
  return fallback;
}
