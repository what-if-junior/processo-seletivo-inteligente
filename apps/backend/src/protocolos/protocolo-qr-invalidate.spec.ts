import { StatusCandidatura } from '@repo/types';
import { isProtocoloValidoParaStatus } from '../candidaturas/protocolo.util';
import { ProtocolosService } from './protocolos.service';

/**
 * W15 gate: cancel invalidates QR validation while keeping the protocol string
 * (downloaded PDF does not update — live endpoint returns valido=false).
 */
describe('W15 protocol QR invalidate after cancel', () => {
  const candidaturasService = {
    findByProtocolo: jest.fn(),
    cancel: jest.fn(),
  };

  const protocolos = new ProtocolosService(candidaturasService as never);

  const protocolo = '001-C1-2024-00001-1';

  beforeEach(() => jest.clearAllMocks());

  it('validate succeeds before cancel and fails after', async () => {
    candidaturasService.findByProtocolo.mockResolvedValueOnce({
      id: 1,
      protocolo,
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      usuario: { nome_completo: 'João' },
      oferta: { curso: { nome: 'Sistemas' }, campus: { nome: 'Taguatinga' } },
      data_inscricao: '2024-05-21',
    });

    const before = await protocolos.validar(protocolo);
    expect(before.valido).toBe(true);

    candidaturasService.findByProtocolo.mockResolvedValueOnce({
      id: 1,
      protocolo,
      status: StatusCandidatura.CANCELADA,
      usuario: { nome_completo: 'João' },
      oferta: { curso: { nome: 'Sistemas' }, campus: { nome: 'Taguatinga' } },
      data_inscricao: '2024-05-21',
    });

    const after = await protocolos.validar(protocolo);
    expect(after.valido).toBe(false);
    expect(isProtocoloValidoParaStatus(after.status)).toBe(false);
    expect(after.protocolo).toBe(protocolo);
  });
});
