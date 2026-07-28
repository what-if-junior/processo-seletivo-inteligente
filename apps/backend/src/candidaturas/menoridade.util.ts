/** Majority age for REQ-2.4 / RS02 (idade na data do submit). */
export const IDADE_MAIORIDADE = 18;

export const MSG_MENOR_RESPONSAVEL_OBRIGATORIO =
  'Candidato menor de idade na data da inscrição: informe nome e CPF do responsável, aceite o termo e anexe o documento do responsável.';

export const MSG_MENOR_SEM_NASCIMENTO =
  'Data de nascimento do candidato é obrigatória para validar menoridade na inscrição.';

/**
 * Full calendar years between birth date and reference date (YYYY-MM-DD).
 * Returns true when age at `dataRef` is strictly less than majority.
 */
export function isMenorNaData(
  dataNascimento: string,
  dataRef: string,
  majority = IDADE_MAIORIDADE,
): boolean {
  const birth = parseIsoDate(dataNascimento);
  const ref = parseIsoDate(dataRef);
  if (!birth || !ref) {
    throw new Error('Datas inválidas para cálculo de menoridade');
  }
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = ref.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && ref.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age < majority;
}

function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Decode base64 (optionally data-URL) into a Buffer; empty/invalid → null. */
export function decodeDocumentoBase64(
  raw: string | undefined | null,
): Buffer | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const payload = trimmed.includes(',')
    ? trimmed.slice(trimmed.indexOf(',') + 1)
    : trimmed;
  try {
    const buf = Buffer.from(payload, 'base64');
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}
