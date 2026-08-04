import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CanalNotificacao,
  OrigemNotificacao,
  StatusCandidatura,
  StatusEntregaNotificacao,
  TipoEtapaCronograma,
  TipoLembreteNotificacao,
} from '@repo/types';
import { NotificacoesService } from './notificacoes.service';
import { Notificacao } from './entities/notificacao.entity';
import { NotificacaoLeitura } from './entities/notificacao-leitura.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { NotificacaoEntrega } from './entities/notificacao-entrega.entity';
import { LembreteNotificacao } from './entities/lembrete-notificacao.entity';
import { LembreteDisparo } from './entities/lembrete-disparo.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { User } from '../user/entities/user.entity';
import { CronogramaEtapa } from '../cronograma/entities/cronograma-etapa.entity';
import { Edital } from '../editais/entities/edital.entity';
import {
  buildDisparoChave,
  renderTemplate,
} from './notificacoes-audience.util';

describe('notificacoes-audience.util', () => {
  it('renders template vars', () => {
    expect(
      renderTemplate('Olá {{edital}} até {{data_fim}}', {
        edital: '001/2026',
        data_fim: '2026-02-01',
      }),
    ).toBe('Olá 001/2026 até 2026-02-01');
  });

  it('builds disparo chave', () => {
    expect(buildDisparoChave(1, 2, 3, '2026-01-01T10')).toBe(
      '1:2:3:2026-01-01T10',
    );
  });
});

describe('NotificacoesService', () => {
  let service: NotificacoesService;

  const notifRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 50, ...x })),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const leituraRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const prefRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, id_usuario: 10, ...x })),
    findOne: jest.fn(),
  };
  const entregaRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
  };
  const lembreteRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const disparoRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    findOne: jest.fn(),
  };
  const candidaturaRepo = {
    createQueryBuilder: jest.fn(),
  };
  const userRepo = {
    findOne: jest.fn(),
  };
  const etapaRepo = {
    find: jest.fn(),
  };
  const editalRepo = {
    findOne: jest.fn(),
  };

  function audienceQb(ids: number[]) {
    return {
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(
        ids.map((id) => ({ id_usuario: id })),
      ),
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    prefRepo.findOne.mockResolvedValue({
      id: 1,
      id_usuario: 10,
      silenciar_email: false,
      silenciar_push: false,
      silenciar_oficiais: false,
    });
    userRepo.findOne.mockResolvedValue({
      id: 10,
      email: 'c@example.com',
    });
    candidaturaRepo.createQueryBuilder.mockReturnValue(audienceQb([10, 11]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacoesService,
        { provide: getRepositoryToken(Notificacao), useValue: notifRepo },
        {
          provide: getRepositoryToken(NotificacaoLeitura),
          useValue: leituraRepo,
        },
        {
          provide: getRepositoryToken(PreferenciaNotificacao),
          useValue: prefRepo,
        },
        {
          provide: getRepositoryToken(NotificacaoEntrega),
          useValue: entregaRepo,
        },
        {
          provide: getRepositoryToken(LembreteNotificacao),
          useValue: lembreteRepo,
        },
        { provide: getRepositoryToken(LembreteDisparo), useValue: disparoRepo },
        { provide: getRepositoryToken(Candidatura), useValue: candidaturaRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(CronogramaEtapa), useValue: etapaRepo },
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
      ],
    }).compile();

    service = module.get(NotificacoesService);
  });

  it('createAndDispatch notifies cohort with pwa + adiado_smtp email', async () => {
    const result = await service.createAndDispatch({
      titulo: 'Aviso',
      corpo: 'Corpo',
      id_edital: 1,
      origem: OrigemNotificacao.MANUAL,
    });

    expect(result.destinatarios).toBe(2);
    expect(result.leituras_criadas).toBe(2);
    expect(result.email_adiados).toBe(2);
    expect(leituraRepo.save).toHaveBeenCalled();
    expect(entregaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: CanalNotificacao.EMAIL,
        status: StatusEntregaNotificacao.ADIADO_SMTP,
      }),
    );
  });

  it('respects silenciar_oficiais for cronograma notifies', async () => {
    prefRepo.findOne.mockResolvedValue({
      id: 1,
      id_usuario: 10,
      silenciar_email: false,
      silenciar_push: false,
      silenciar_oficiais: true,
    });
    candidaturaRepo.createQueryBuilder.mockReturnValue(audienceQb([10]));

    const result = await service.notifyCohortChange({
      id_edital: 1,
      titulo: 'Etapa',
      corpo: 'Mudou',
    });

    expect(result?.leituras_criadas).toBe(0);
    expect(result?.omitidos_preferencia).toBe(1);
    expect(leituraRepo.save).not.toHaveBeenCalled();
  });

  it('markRead sets lida_em', async () => {
    leituraRepo.findOne.mockResolvedValue({
      id: 3,
      id_notificacao: 50,
      id_usuario: 10,
      lida_em: null,
      notificacao: {
        id: 50,
        titulo: 'T',
        corpo: 'C',
        deep_link: null,
        origem: OrigemNotificacao.MANUAL,
        id_edital: 1,
        criado_em: new Date(),
        enviado_em: new Date(),
      },
    });
    const row = await service.markRead(10, 50);
    expect(row.lida).toBe(true);
    expect(leituraRepo.save).toHaveBeenCalled();
  });

  it('markRead 404 when missing', async () => {
    leituraRepo.findOne.mockResolvedValue(null);
    await expect(service.markRead(10, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createLembrete validates tipo', async () => {
    await expect(
      service.createLembrete({
        tipo: 'x' as TipoLembreteNotificacao,
        offset_horas: -24,
        titulo_template: 't',
        corpo_template: 'c',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processLembretes fires matrícula due for approved cohort', async () => {
    const now = new Date('2026-02-08T12:00:00.000Z');
    lembreteRepo.find.mockResolvedValue([
      {
        id: 1,
        tipo: TipoLembreteNotificacao.MATRICULA_PRAZO,
        id_edital: null,
        offset_horas: -48,
        titulo_template: 'Prazo {{edital}}',
        corpo_template: 'Fim {{data_fim}}',
        ativo: true,
      },
    ]);
    etapaRepo.find.mockResolvedValue([
      {
        id: 7,
        id_edital: 1,
        tipo: TipoEtapaCronograma.MATRICULA,
        nome_exibido: 'Matrícula',
        data_inicio: new Date('2026-02-01T00:00:00.000Z'),
        data_fim: new Date('2026-02-10T00:00:00.000Z'),
      },
    ]);
    editalRepo.findOne.mockResolvedValue({ id: 1, numero_ano: '001/2026' });
    candidaturaRepo.createQueryBuilder.mockReturnValue(audienceQb([10]));
    disparoRepo.findOne.mockResolvedValue(null);
    prefRepo.findOne.mockResolvedValue({
      id: 1,
      id_usuario: 10,
      silenciar_email: false,
      silenciar_push: false,
      silenciar_oficiais: false,
    });

    const result = await service.processLembretes(now);
    expect(result.disparos).toBe(1);
    expect(disparoRepo.save).toHaveBeenCalled();
    expect(notifRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Prazo 001/2026',
        origem: OrigemNotificacao.AUTOMATICO_CRONOGRAMA,
      }),
    );
  });

  it('notifyUser targets single candidate', async () => {
    const id = await service.notifyUser({
      id_usuario: 10,
      titulo: 'Doc',
      corpo: 'ok',
      oficial: false,
      canais: ['pwa'],
    });
    expect(id).toBe(50);
    expect(leituraRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id_usuario: 10 }),
    );
  });

  it('resolveAudienceUserIds uses STATUS_COORTE_ATIVA by default', async () => {
    const qb = audienceQb([1]);
    candidaturaRepo.createQueryBuilder.mockReturnValue(qb);
    await service.resolveAudienceUserIds({ id_edital: 9 });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'c.status IN (:...statuses)',
      expect.objectContaining({
        statuses: expect.arrayContaining([
          StatusCandidatura.INSCRICAO_RECEBIDA,
          StatusCandidatura.APROVADO,
        ]),
      }),
    );
  });
});
