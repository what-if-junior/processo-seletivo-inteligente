/**
 * REQ-2.5 protocol: `EDITAL-CURSO-ANO-SEQ-IDALUNO`
 * Example: `001-C1-2024-00001-1`
 */

export type ProtocoloParts = {
  editalCodigo: string;
  cursoCodigo: string;
  ano: string;
  seq: number;
  idAluno: number;
};

/** Parse `001/2024`, `001-2024`, or bare number into edital + year parts. */
export function parseEditalNumeroAno(numeroAno: string): {
  editalCodigo: string;
  ano: string;
} {
  const trimmed = (numeroAno ?? '').trim();
  const slash = /^(\d+)\s*[\/\-]\s*(\d{4})$/.exec(trimmed);
  if (slash) {
    return { editalCodigo: slash[1], ano: slash[2] };
  }
  const yearOnly = /(\d{4})$/.exec(trimmed);
  const ano = yearOnly?.[1] ?? String(new Date().getFullYear());
  const editalCodigo =
    trimmed.replace(/[^\w]+/g, '').replace(ano, '') || trimmed || '0';
  return { editalCodigo, ano };
}

export function cursoCodigoFromId(idCurso: number): string {
  return `C${idCurso}`;
}

export function formatProtocolo(parts: ProtocoloParts): string {
  const seq = String(Math.max(1, parts.seq)).padStart(5, '0');
  return [
    parts.editalCodigo,
    parts.cursoCodigo,
    parts.ano,
    seq,
    String(parts.idAluno),
  ].join('-');
}

export function isProtocoloValidoParaStatus(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return status !== 'cancelada';
}
