import {
  COTA_AC,
  computeRemanescentes,
  distribuicaoToSeatPlan,
  planoProximaChamada,
  totalRemanescentes,
  totalVagas,
} from './remanescentes.util';

describe('remanescentes.util (W22 / REQ-3.1)', () => {
  describe('distribuicaoToSeatPlan', () => {
    it('respeita vagas absolutas e devolve o resto à AC', () => {
      const plano = distribuicaoToSeatPlan(
        [
          { tipo_cota: 'PPI', vagas: 4 },
          { tipo_cota: 'PCD', vagas: 2 },
        ],
        10,
      );

      expect(plano).toEqual([
        { tipo_cota: 'AC', vagas: 4 },
        { tipo_cota: 'PCD', vagas: 2 },
        { tipo_cota: 'PPI', vagas: 4 },
      ]);
      expect(totalVagas(plano)).toBe(10);
    });

    it('converte percentuais em vagas absolutas', () => {
      const plano = distribuicaoToSeatPlan(
        [{ tipo_cota: 'PPI', percentual: '50.00' }],
        20,
      );

      expect(plano).toEqual([
        { tipo_cota: 'AC', vagas: 10 },
        { tipo_cota: 'PPI', vagas: 10 },
      ]);
    });

    it('sem distribuição, todas as vagas ficam na AC', () => {
      expect(distribuicaoToSeatPlan([], 5)).toEqual([
        { tipo_cota: COTA_AC, vagas: 5 },
      ]);
    });

    it('não deixa a AC negativa quando as cotas excedem o total', () => {
      const plano = distribuicaoToSeatPlan(
        [{ tipo_cota: 'PPI', vagas: 12 }],
        10,
      );
      expect(plano.find((l) => l.tipo_cota === COTA_AC)).toBeUndefined();
    });
  });

  describe('remanescentes pós-chamada', () => {
    const outcomes = [
      { tipo_cota: 'AC', vagas: 4, preenchidas: 4 },
      { tipo_cota: 'PPI', vagas: 4, preenchidas: 1 },
      { tipo_cota: 'PCD', vagas: 2, preenchidas: 0 },
    ];

    it('conta as vagas ociosas por cota', () => {
      expect(computeRemanescentes(outcomes)).toEqual([
        { tipo_cota: 'AC', remanescentes: 0 },
        { tipo_cota: 'PPI', remanescentes: 3 },
        { tipo_cota: 'PCD', remanescentes: 2 },
      ]);
      expect(totalRemanescentes(outcomes)).toBe(5);
    });

    it('reverte as vagas de cota não preenchidas para AC na chamada seguinte', () => {
      expect(planoProximaChamada(outcomes)).toEqual([
        { tipo_cota: COTA_AC, vagas: 5 },
      ]);
    });

    it('não gera chamada seguinte quando tudo foi preenchido', () => {
      expect(
        planoProximaChamada([{ tipo_cota: 'AC', vagas: 3, preenchidas: 3 }]),
      ).toEqual([]);
    });
  });
});
