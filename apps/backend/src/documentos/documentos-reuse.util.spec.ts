import {
  matchDocumentoConta,
  normalizeDocTipoNome,
  parseEspelharFlag,
} from './documentos-reuse.util';

describe('documentos-reuse.util', () => {
  it('normalizes accents and whitespace', () => {
    expect(normalizeDocTipoNome('  RG / CNH  ')).toBe('rg / cnh');
    expect(normalizeDocTipoNome('Histórico Escolar')).toBe('historico escolar');
  });

  it('matches by id_tipo_base first', () => {
    const match = matchDocumentoConta(
      { id_tipo_base: 4, nome: 'RG' },
      [
        { id: 10, id_tipo_base: 4, tipo_nome: 'Outro' },
        { id: 11, id_tipo_base: 9, tipo_nome: 'RG' },
      ],
    );
    expect(match).toEqual({ id: 10, match_by: 'id_tipo_base' });
  });

  it('falls back to nome when id_tipo_base missing or unmatched', () => {
    const byNome = matchDocumentoConta(
      { id_tipo_base: null, nome: 'CPF' },
      [{ id: 2, id_tipo_base: 1, tipo_nome: 'cpf' }],
    );
    expect(byNome).toEqual({ id: 2, match_by: 'nome' });

    const noMatch = matchDocumentoConta(
      { id_tipo_base: 99, nome: 'Laudo' },
      [{ id: 2, id_tipo_base: 1, tipo_nome: 'CPF' }],
    );
    expect(noMatch).toBeNull();
  });

  it('parses espelhar multipart flag', () => {
    expect(parseEspelharFlag('true')).toBe(true);
    expect(parseEspelharFlag('1')).toBe(true);
    expect(parseEspelharFlag('false')).toBe(false);
    expect(parseEspelharFlag(undefined)).toBe(false);
  });
});
