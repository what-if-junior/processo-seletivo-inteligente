/** Normalize tipo names for REQ-2.6 match (ID and/or nome). */
export function normalizeDocTipoNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export type ReuseExigencia = {
  id_tipo_base?: number | null;
  nome: string;
};

export type ReuseContaCandidate = {
  id: number;
  id_tipo_base: number;
  tipo_nome?: string | null;
};

export type ReuseMatch = {
  id: number;
  match_by: 'id_tipo_base' | 'nome';
};

/**
 * Match Meus Dados (DocumentosConta) to an edital exigência.
 * Prefer id_tipo_base; fall back to normalized nome vs tipo_nome.
 */
export function matchDocumentoConta(
  exigencia: ReuseExigencia,
  contaDocs: ReuseContaCandidate[],
): ReuseMatch | null {
  if (!contaDocs.length) return null;

  const baseId = exigencia.id_tipo_base;
  if (baseId != null && Number(baseId) > 0) {
    const byId = contaDocs.find((d) => Number(d.id_tipo_base) === Number(baseId));
    if (byId) return { id: byId.id, match_by: 'id_tipo_base' };
  }

  const target = normalizeDocTipoNome(exigencia.nome || '');
  if (!target) return null;

  const byNome = contaDocs.find((d) => {
    const nome = normalizeDocTipoNome(d.tipo_nome || '');
    return nome.length > 0 && nome === target;
  });
  return byNome ? { id: byNome.id, match_by: 'nome' } : null;
}

export function parseEspelharFlag(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw !== 'string') return false;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}
