import {
  cursoCodigoFromId,
  formatProtocolo,
  isProtocoloValidoParaStatus,
  parseEditalNumeroAno,
} from './protocolo.util';

describe('protocolo.util', () => {
  it('parses edital numero_ano into EDITAL + ANO', () => {
    expect(parseEditalNumeroAno('001/2024')).toEqual({
      editalCodigo: '001',
      ano: '2024',
    });
    expect(parseEditalNumeroAno('12-2025')).toEqual({
      editalCodigo: '12',
      ano: '2025',
    });
  });

  it('builds EDITAL-CURSO-ANO-SEQ-IDALUNO', () => {
    expect(
      formatProtocolo({
        editalCodigo: '001',
        cursoCodigo: cursoCodigoFromId(1),
        ano: '2024',
        seq: 1,
        idAluno: 7,
      }),
    ).toBe('001-C1-2024-00001-7');
  });

  it('marks cancelada as invalid for QR', () => {
    expect(isProtocoloValidoParaStatus('inscricao_recebida')).toBe(true);
    expect(isProtocoloValidoParaStatus('cancelada')).toBe(false);
    expect(isProtocoloValidoParaStatus(null)).toBe(false);
  });
});
