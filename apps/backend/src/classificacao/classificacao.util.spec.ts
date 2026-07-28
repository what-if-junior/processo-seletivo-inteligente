import { ListaClassificacao } from '@repo/types';
import { classificar, type CandidatoClassificavel } from './classificacao.util';
import { totalVagas, type SeatPlan } from './remanescentes.util';

const plano: SeatPlan[] = [
  { tipo_cota: 'AC', vagas: 2 },
  { tipo_cota: 'PPI', vagas: 2 },
];

/** Ordem 1..6 = ordem classificatória geral do método do edital. */
const candidatos: CandidatoClassificavel[] = [
  { id_candidatura: 1, tipo_cota: 'AC', ordem: 1 },
  { id_candidatura: 2, tipo_cota: 'PPI', ordem: 2 },
  { id_candidatura: 3, tipo_cota: 'PPI', ordem: 3 },
  { id_candidatura: 4, tipo_cota: 'AC', ordem: 4 },
  { id_candidatura: 5, tipo_cota: 'PPI', ordem: 5 },
  { id_candidatura: 6, tipo_cota: 'AC', ordem: 6 },
];

const ids = (itens: { id_candidatura: number }[]) =>
  itens.map((item) => item.id_candidatura);

describe('classificacao.util (W23 / REQ-3.2 e 3.3)', () => {
  describe('fallback_ac_para_rv = false', () => {
    const resultado = classificar(candidatos, plano, {
      fallbackAcParaRv: false,
    });

    it('mantém o cotista a concorrer apenas na sua cota', () => {
      expect(ids(resultado.chamada_regular)).toEqual([1, 4, 2, 3]);
      expect(
        resultado.chamada_regular.every((item) => !item.realocado_para_ac),
      ).toBe(true);
    });

    it('manda os excedentes para a lista de espera', () => {
      expect(ids(resultado.espera)).toEqual([5, 6]);
      expect(resultado.espera.map((item) => item.posicao)).toEqual([1, 2]);
      expect(
        resultado.espera.every(
          (item) => item.lista === ListaClassificacao.ESPERA,
        ),
      ).toBe(true);
    });
  });

  describe('fallback_ac_para_rv = true', () => {
    const resultado = classificar(candidatos, plano, {
      fallbackAcParaRv: true,
    });

    it('avalia o cotista primeiro na AC e marca a realocação', () => {
      expect(ids(resultado.chamada_regular)).toEqual([1, 2, 3, 5]);
      const cotistaNaAc = resultado.chamada_regular.find(
        (item) => item.id_candidatura === 2,
      );
      expect(cotistaNaAc).toMatchObject({
        tipo_cota: 'AC',
        realocado_para_ac: true,
      });
    });

    it('liberta a vaga de cota para o cotista seguinte (REQ-3.3)', () => {
      expect(
        resultado.chamada_regular.filter((item) => item.tipo_cota === 'PPI'),
      ).toHaveLength(2);
      expect(ids(resultado.espera)).toEqual([4, 6]);
    });

    it('devolve o cotista não classificado na AC à fila da sua RV', () => {
      const soUmaVagaAc: SeatPlan[] = [
        { tipo_cota: 'AC', vagas: 1 },
        { tipo_cota: 'PPI', vagas: 1 },
      ];
      const parcial = classificar(candidatos, soUmaVagaAc, {
        fallbackAcParaRv: true,
      });

      expect(ids(parcial.chamada_regular)).toEqual([1, 2]);
      expect(parcial.chamada_regular[1]).toMatchObject({
        id_candidatura: 2,
        tipo_cota: 'PPI',
      });
    });
  });

  describe('tamanho das listas', () => {
    it('nunca convoca mais do que as vagas da chamada', () => {
      for (const fallbackAcParaRv of [false, true]) {
        const resultado = classificar(candidatos, plano, { fallbackAcParaRv });
        expect(resultado.chamada_regular).toHaveLength(totalVagas(plano));
        expect(resultado.espera).toHaveLength(
          candidatos.length - totalVagas(plano),
        );
        expect(resultado.itens).toHaveLength(candidatos.length);
      }
    });

    it('limita-se aos candidatos quando há mais vagas do que inscritos', () => {
      const resultado = classificar(candidatos.slice(0, 2), plano, {
        fallbackAcParaRv: false,
      });

      expect(resultado.chamada_regular).toHaveLength(2);
      expect(resultado.espera).toHaveLength(0);
      expect(resultado.vagas).toEqual([
        { tipo_cota: 'AC', vagas: 2, preenchidas: 1 },
        { tipo_cota: 'PPI', vagas: 2, preenchidas: 1 },
      ]);
    });

    it('não convoca ninguém sem vagas na chamada', () => {
      const resultado = classificar(candidatos, [], {
        fallbackAcParaRv: true,
      });

      expect(resultado.chamada_regular).toHaveLength(0);
      expect(resultado.espera).toHaveLength(candidatos.length);
    });
  });
});
