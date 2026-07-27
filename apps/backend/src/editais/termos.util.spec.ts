import { BadRequestException } from '@nestjs/common';
import { TermosModo } from '@repo/types';
import {
  assertNoConflictingTermosChannels,
  assertTermosOneMode,
} from './termos.util';

describe('assertTermosOneMode', () => {
  it('accepts URL mode with https valor', () => {
    expect(() =>
      assertTermosOneMode(
        TermosModo.URL,
        'https://www.ifb.edu.br/editais/termos.pdf',
      ),
    ).not.toThrow();
  });

  it('accepts PDF mode with non-empty reference', () => {
    expect(() =>
      assertTermosOneMode(TermosModo.PDF, 'editais/001/termos.pdf'),
    ).not.toThrow();
  });

  it('accepts TEXTO mode with rich text', () => {
    expect(() =>
      assertTermosOneMode(TermosModo.TEXTO, '<p>Aceito os termos</p>'),
    ).not.toThrow();
  });

  it('rejects missing modo', () => {
    expect(() => assertTermosOneMode(undefined, 'x')).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid modo (not one of the three)', () => {
    expect(() => assertTermosOneMode('AMBOS' as TermosModo, 'x')).toThrow(
      /PDF \| URL \| TEXTO/,
    );
  });

  it('rejects empty valor', () => {
    expect(() => assertTermosOneMode(TermosModo.TEXTO, '  ')).toThrow(
      BadRequestException,
    );
  });

  it('rejects URL mode without valid http(s)', () => {
    expect(() => assertTermosOneMode(TermosModo.URL, 'not-a-url')).toThrow(
      BadRequestException,
    );
    expect(() => assertTermosOneMode(TermosModo.URL, 'ftp://x')).toThrow(
      BadRequestException,
    );
  });
});

describe('assertNoConflictingTermosChannels', () => {
  it('allows termos_modo + termos_valor only', () => {
    expect(() =>
      assertNoConflictingTermosChannels({
        termos_modo: 'URL',
        termos_valor: 'https://example.com',
      }),
    ).not.toThrow();
  });

  it('rejects parallel termos_pdf / termos_url / termos_texto fields', () => {
    expect(() =>
      assertNoConflictingTermosChannels({
        termos_modo: 'URL',
        termos_valor: 'https://example.com',
        termos_pdf: 'x',
        termos_url: 'y',
      }),
    ).toThrow(/termos_pdf, termos_url/);
  });
});
