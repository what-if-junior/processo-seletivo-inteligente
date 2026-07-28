import { StatusCandidatura } from '@repo/types';
import { ProtocolosService } from './protocolos.service';

describe('ProtocolosService', () => {
  const candidaturasService = {
    findByProtocolo: jest.fn(),
  };

  const service = new ProtocolosService(
    candidaturasService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns valido=true for active inscription', async () => {
    candidaturasService.findByProtocolo.mockResolvedValue({
      id: 1,
      protocolo: '001-C1-2024-00001-1',
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      data_inscricao: '2024-05-21',
      usuario: { nome_completo: 'João' },
      oferta: {
        curso: { nome: 'Sistemas' },
        campus: { nome: 'Taguatinga' },
      },
    });

    const result = await service.validar('001-C1-2024-00001-1');
    expect(result.valido).toBe(true);
    expect(result.candidato).toBe('João');
    expect(result.motivo).toBeUndefined();
  });

  it('invalidates QR after cancel (valido=false)', async () => {
    candidaturasService.findByProtocolo.mockResolvedValue({
      id: 1,
      protocolo: '001-C1-2024-00001-1',
      status: StatusCandidatura.CANCELADA,
      data_inscricao: '2024-05-21',
      usuario: { nome_completo: 'João' },
      oferta: {
        curso: { nome: 'Sistemas' },
        campus: { nome: 'Taguatinga' },
      },
    });

    const result = await service.validar('001-C1-2024-00001-1');
    expect(result.valido).toBe(false);
    expect(result.status).toBe(StatusCandidatura.CANCELADA);
    expect(result.motivo).toMatch(/invalidado/i);
  });

  it('returns valido=false when protocol is missing', async () => {
    candidaturasService.findByProtocolo.mockResolvedValue(null);
    const result = await service.validar('NOPE');
    expect(result.valido).toBe(false);
    expect(result.motivo).toMatch(/não encontrado/i);
  });
});
