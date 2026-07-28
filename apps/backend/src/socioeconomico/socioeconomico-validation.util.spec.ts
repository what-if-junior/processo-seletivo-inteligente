import { BadRequestException } from '@nestjs/common';
import { TipoVagaCandidatura } from '@repo/types';
import type { SocioeconomicoDto } from './dto/socioeconomico.dto';
import {
  assertNumeroPessoas,
  assertSocioNotSentForOtherCota,
  assertSocioPayloadForBaixaRenda,
  isBaixaRenda,
  MSG_SOCIO_FAIXA_REQUIRED,
  MSG_SOCIO_NOT_ALLOWED,
  MSG_SOCIO_NUMERO_PESSOAS,
} from './socioeconomico-validation.util';

describe('socioeconomico-validation.util', () => {
  it('detects BAIXA_RENDA', () => {
    expect(isBaixaRenda(TipoVagaCandidatura.BAIXA_RENDA)).toBe(true);
    expect(isBaixaRenda(TipoVagaCandidatura.AC)).toBe(false);
  });

  it('assertNumeroPessoas requires ≥ 1 integer', () => {
    expect(assertNumeroPessoas(1)).toBe(1);
    expect(assertNumeroPessoas(4)).toBe(4);
    expect(() => assertNumeroPessoas(0)).toThrow(BadRequestException);
    expect(() => assertNumeroPessoas(0)).toThrow(MSG_SOCIO_NUMERO_PESSOAS);
    expect(() => assertNumeroPessoas(1.5)).toThrow(MSG_SOCIO_NUMERO_PESSOAS);
    expect(() => assertNumeroPessoas(null)).toThrow(MSG_SOCIO_NUMERO_PESSOAS);
  });

  it('regra B skips hard faixa/pessoas validation', () => {
    expect(assertSocioPayloadForBaixaRenda(undefined, true)).toEqual({});
    expect(
      assertSocioPayloadForBaixaRenda({ campos_extras: { a: 1 } }, true),
    ).toEqual({ campos_extras: { a: 1 } });
  });

  it('active bands require faixa + pessoas', () => {
    expect(() => assertSocioPayloadForBaixaRenda(undefined, false)).toThrow(
      MSG_SOCIO_FAIXA_REQUIRED,
    );
    expect(() =>
      assertSocioPayloadForBaixaRenda({ id_faixa: 1 }, false),
    ).toThrow(MSG_SOCIO_NUMERO_PESSOAS);
    expect(
      assertSocioPayloadForBaixaRenda(
        { id_faixa: 2, numero_pessoas: 3 },
        false,
      ),
    ).toEqual({ id_faixa: 2, numero_pessoas: 3 });
  });

  it('rejects socio payload on non-baixa-renda', () => {
    expect(() =>
      assertSocioNotSentForOtherCota(TipoVagaCandidatura.AC, {
        id_faixa: 1,
        numero_pessoas: 2,
      }),
    ).toThrow(MSG_SOCIO_NOT_ALLOWED);
    expect(() =>
      assertSocioNotSentForOtherCota(TipoVagaCandidatura.AC, undefined),
    ).not.toThrow();
  });
});
