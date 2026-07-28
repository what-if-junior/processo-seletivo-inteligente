import { buildComprovantePdf, buildProtocoloValidateUrl } from './comprovante-pdf.util';

describe('comprovante-pdf.util', () => {
  it('builds validate URL with encoded protocol', () => {
    expect(
      buildProtocoloValidateUrl(
        'http://localhost:5005/',
        '001-C1-2024-00001-1',
      ),
    ).toBe('http://localhost:5005/protocolos/001-C1-2024-00001-1');
  });

  it('generates a PDF buffer starting with %PDF', async () => {
    const buf = await buildComprovantePdf({
      protocolo: '001-C1-2024-00001-1',
      validateUrl: 'http://localhost:5005/protocolos/001-C1-2024-00001-1',
      candidato: 'João Silva',
      curso: 'Técnico em Desenvolvimento de Sistemas',
      campus: 'Taguatinga',
      dataInscricao: '21/05/2024',
      status: 'inscricao_recebida',
    });
    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  });
});
