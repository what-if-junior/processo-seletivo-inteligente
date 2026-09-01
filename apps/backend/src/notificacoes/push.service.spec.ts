// IMPORTANTE: jest.mock deve vir ANTES dos imports — ts-jest não hoista e o
// PushService importa web-push na carga; sem esta ordem o mock não é aplicado.
jest.mock('web-push', () => ({
  sendNotification: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CanalNotificacao, StatusEntregaNotificacao } from '@repo/types';
import { PushService } from './push.service';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';

/** Acesso tipado ao mock de web-push (evita import top-level do pacote). */
function webpushMock() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('web-push') as {
    sendNotification: jest.Mock;
  };
}

const VAPID_PUBLIC = 'PUBLIC_KEY_123';
const VAPID_PRIVATE = 'PRIVATE_KEY_456';

describe('PushService', () => {
  let service: PushService;

  const subRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const entregaRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
  };
  const prefRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = VAPID_PUBLIC;
    process.env.VAPID_PRIVATE_KEY = VAPID_PRIVATE;
    prefRepo.findOne.mockResolvedValue({
      id: 1,
      id_usuario: 10,
      silenciar_push: false,
    });
    subRepo.findOne.mockResolvedValue(null);
    subRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: subRepo,
        },
        {
          provide: getRepositoryToken(NotificacaoEntrega),
          useValue: entregaRepo,
        },
        {
          provide: getRepositoryToken(PreferenciaNotificacao),
          useValue: prefRepo,
        },
      ],
    }).compile();

    service = module.get(PushService);
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  describe('isEnabled', () => {
    it('false when VAPID env missing', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      expect(service.isEnabled()).toBe(false);
    });

    it('true when both VAPID keys present', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('creates new subscription when none exists', async () => {
      const dto = {
        endpoint: 'https://push.example.com/x',
        p256dh: 'P256',
        auth: 'AUTH',
        user_agent: 'Mozilla',
      };
      const result = await service.subscribe(10, dto);

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario: 10,
          endpoint: dto.endpoint,
          p256dh: dto.p256dh,
          auth: dto.auth,
        }),
      );
      expect(subRepo.save).toHaveBeenCalled();
      expect(result.endpoint).toBe(dto.endpoint);
    });

    it('updates existing subscription by (user, endpoint)', async () => {
      subRepo.findOne.mockResolvedValue({
        id: 7,
        id_usuario: 10,
        endpoint: 'https://push.example.com/x',
        p256dh: 'old',
        auth: 'old',
      });
      const dto = {
        endpoint: 'https://push.example.com/x',
        p256dh: 'new',
        auth: 'new',
        user_agent: undefined,
      };
      const result = await service.subscribe(10, dto);

      expect(result.p256dh).toBe('new');
      expect(result.auth).toBe('new');
      expect(subRepo.findOne).toHaveBeenCalledWith({
        where: { id_usuario: 10, endpoint: dto.endpoint },
      });
    });
  });

  describe('sendToUser', () => {
    it('no VAPID → { enviadas: 0, motivo: vapid_ausente }', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      const result = await service.sendToUser(10, {
        titulo: 'T',
        corpo: 'C',
      }, 50);

      expect(result).toEqual({ enviadas: 0, motivo: 'vapid_ausente' });
      expect(subRepo.find).not.toHaveBeenCalled();
    });

    it('respects silenciar_push (records omitido, no send)', async () => {
      prefRepo.findOne.mockResolvedValue({
        id: 1,
        id_usuario: 10,
        silenciar_push: true,
      });
      const result = await service.sendToUser(10, {
        titulo: 'T',
        corpo: 'C',
      }, 50);

      expect(result).toEqual({ enviadas: 0, motivo: 'silenciar_push' });
      expect(webpushMock().sendNotification).not.toHaveBeenCalled();
      expect(entregaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id_notificacao: 50,
          canal: CanalNotificacao.PWA,
          status: StatusEntregaNotificacao.OMITIDO_PREFERENCIA,
          detalhe: 'push: silenciar_push',
        }),
      );
    });

    it('no subscriptions → sem_assinaturas', async () => {
      subRepo.find.mockResolvedValue([]);
      const result = await service.sendToUser(10, {
        titulo: 'T',
        corpo: 'C',
      }, 50);

      expect(result).toEqual({ enviadas: 0, motivo: 'sem_assinaturas' });
      expect(webpushMock().sendNotification).not.toHaveBeenCalled();
    });

    it('sends to each subscription and records ENVIADO', async () => {
      subRepo.find.mockResolvedValue([
        { id: 1, endpoint: 'e1', p256dh: 'p1', auth: 'a1' },
        { id: 2, endpoint: 'e2', p256dh: 'p2', auth: 'a2' },
      ]);
      (webpushMock().sendNotification).mockResolvedValue(undefined);

      const result = await service.sendToUser(10, {
        titulo: 'Título',
        corpo: 'Corpo',
        deep_link: '/inscricoes',
      }, 50);

      expect(result.enviadas).toBe(2);
      expect(webpushMock().sendNotification).toHaveBeenCalledTimes(2);
      expect(entregaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id_notificacao: 50,
          canal: CanalNotificacao.PWA,
          status: StatusEntregaNotificacao.ENVIADO,
          detalhe: 'push',
        }),
      );
    });

    it('removes expired subscriptions on 404/410', async () => {
      subRepo.find.mockResolvedValue([
        { id: 3, endpoint: 'e3', p256dh: 'p3', auth: 'a3' },
      ]);
      (webpushMock().sendNotification).mockRejectedValue({
        statusCode: 410,
        message: 'gone',
      });

      const result = await service.sendToUser(10, {
        titulo: 'T',
        corpo: 'C',
      }, 50);

      expect(result.enviadas).toBe(0);
      expect(subRepo.delete).toHaveBeenCalledWith(3);
      expect(entregaRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: StatusEntregaNotificacao.FALHOU }),
      );
    });

    it('records FALHOU on other errors without throwing', async () => {
      subRepo.find.mockResolvedValue([
        { id: 4, endpoint: 'e4', p256dh: 'p4', auth: 'a4' },
      ]);
      (webpushMock().sendNotification).mockRejectedValue(
        new Error('network down'),
      );

      const result = await service.sendToUser(10, {
        titulo: 'T',
        corpo: 'C',
      }, 50);

      expect(result.enviadas).toBe(0);
      expect(entregaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: StatusEntregaNotificacao.FALHOU,
          detalhe: expect.stringContaining('network down'),
        }),
      );
    });
  });
});