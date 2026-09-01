import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CanalNotificacao, StatusEntregaNotificacao } from '@repo/types';
import { EmailWorkerService } from './email-worker.service';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { Notificacao } from './entities/notificacao.entity';
import { User } from '../user/entities/user.entity';

describe('EmailWorkerService', () => {
  let service: EmailWorkerService;

  const entregaRepo = {
    find: jest.fn(),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
  };
  const notifRepo = {
    find: jest.fn(),
  };
  const userRepo = {
    find: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  const ROW = {
    id: 1,
    id_notificacao: 50,
    id_usuario: 10,
    canal: CanalNotificacao.EMAIL,
    status: StatusEntregaNotificacao.ADIADO_SMTP,
    destino: 'c@example.com',
    processado_em: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) =>
      key === 'N8N_EMAIL_ENDPOINT' ? 'https://n8n.example.com/email' : null,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailWorkerService,
        { provide: getRepositoryToken(NotificacaoEntrega), useValue: entregaRepo },
        { provide: getRepositoryToken(Notificacao), useValue: notifRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(EmailWorkerService);
  });

  it('fail-closed: no endpoint → nothing processed', async () => {
    configService.get.mockReturnValue(undefined);
    const result = await service.drainOutbox();
    expect(result).toEqual({
      processados: 0,
      enviados: 0,
      falhas: 0,
      endpoint: null,
    });
    expect(entregaRepo.find).not.toHaveBeenCalled();
  });

  it('drains adiado_smtp rows and POSTs the n8n contract payload', async () => {
    entregaRepo.find.mockResolvedValue([ROW]);
    notifRepo.find.mockResolvedValue([
      { id: 50, titulo: 'Aviso', corpo: 'Corpo do aviso' },
    ]);
    userRepo.find.mockResolvedValue([{ id: 10, email: 'c@example.com' }]);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as Response);

    const result = await service.drainOutbox();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://n8n.example.com/email',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      To: 'c@example.com',
      Subject: 'Aviso',
      'Email Body': 'Corpo do aviso',
      Attachments: [],
    });
    expect(entregaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        status: StatusEntregaNotificacao.ENVIADO,
        processado_em: expect.any(Date),
      }),
    );
    expect(result).toEqual({
      processados: 1,
      enviados: 1,
      falhas: 0,
      endpoint: 'https://n8n.example.com/email',
    });
    fetchMock.mockRestore();
  });

  it('marks FALHOU and keeps going on HTTP error', async () => {
    entregaRepo.find.mockResolvedValue([ROW]);
    notifRepo.find.mockResolvedValue([{ id: 50, titulo: 'A', corpo: 'C' }]);
    userRepo.find.mockResolvedValue([{ id: 10, email: 'c@example.com' }]);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false } as Response);

    const result = await service.drainOutbox();

    expect(result.enviados).toBe(0);
    expect(result.falhas).toBe(1);
    expect(entregaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: StatusEntregaNotificacao.FALHOU }),
    );
    fetchMock.mockRestore();
  });

  it('marks FALHOU when destino missing', async () => {
    entregaRepo.find.mockResolvedValue([{ ...ROW, destino: null }]);
    notifRepo.find.mockResolvedValue([]);
    userRepo.find.mockResolvedValue([{ id: 10, email: null }]);

    const result = await service.drainOutbox();

    expect(result.falhas).toBe(1);
    expect(entregaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: StatusEntregaNotificacao.FALHOU }),
    );
  });
});