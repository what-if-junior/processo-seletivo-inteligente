import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfiguracaoGlobal } from '../faixas/entities/configuracao-global.entity';
import { HubFaqItem } from './entities/hub-faq-item.entity';
import { HubContacto } from './entities/hub-contacto.entity';
import { HubService } from './hub.service';

describe('HubService', () => {
  let service: HubService;
  const faqs: HubFaqItem[] = [];
  const contactos: HubContacto[] = [];
  let config: ConfiguracaoGlobal;
  let faqId = 1;
  let contactoId = 1;

  const faqRepo = {
    find: jest.fn(async (opts?: { where?: { ativo?: boolean } }) => {
      let rows = [...faqs];
      if (opts?.where?.ativo != null) {
        rows = rows.filter((r) => r.ativo === opts.where!.ativo);
      }
      return rows.sort((a, b) => a.ordem - b.ordem || a.id - b.id);
    }),
    findOne: jest.fn(async ({ where }: { where: { id: number } }) =>
      faqs.find((r) => r.id === where.id) ?? null,
    ),
    create: jest.fn((data: Partial<HubFaqItem>) => ({ ...data }) as HubFaqItem),
    save: jest.fn(async (row: HubFaqItem) => {
      if (!row.id) {
        row.id = faqId++;
        row.criado_em = new Date();
        row.atualizado_em = new Date();
        faqs.push(row);
      } else {
        const i = faqs.findIndex((r) => r.id === row.id);
        faqs[i] = { ...faqs[i], ...row, atualizado_em: new Date() };
        return faqs[i];
      }
      return row;
    }),
    delete: jest.fn(async ({ id }: { id: number }) => {
      const i = faqs.findIndex((r) => r.id === id);
      if (i < 0) return { affected: 0 };
      faqs.splice(i, 1);
      return { affected: 1 };
    }),
    createQueryBuilder: jest.fn(() => ({
      select: () => ({
        getRawOne: async () => ({
          max: faqs.length ? String(Math.max(...faqs.map((f) => f.ordem))) : null,
        }),
      }),
    })),
    manager: {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<void>) => {
        const update = async (
          where: { id: number },
          data: { ordem: number },
        ) => {
          const row = faqs.find((r) => r.id === where.id);
          if (row) row.ordem = data.ordem;
        };
        await fn({
          getRepository: () => ({ update }),
        });
      }),
    },
  };

  const contactoRepo = {
    find: jest.fn(async (opts?: { where?: { ativo?: boolean } }) => {
      let rows = [...contactos];
      if (opts?.where?.ativo != null) {
        rows = rows.filter((r) => r.ativo === opts.where!.ativo);
      }
      return rows.sort((a, b) => a.ordem - b.ordem || a.id - b.id);
    }),
    findOne: jest.fn(async ({ where }: { where: { id: number } }) =>
      contactos.find((r) => r.id === where.id) ?? null,
    ),
    create: jest.fn(
      (data: Partial<HubContacto>) => ({ ...data }) as HubContacto,
    ),
    save: jest.fn(async (row: HubContacto) => {
      if (!row.id) {
        row.id = contactoId++;
        row.criado_em = new Date();
        row.atualizado_em = new Date();
        contactos.push(row);
      } else {
        const i = contactos.findIndex((r) => r.id === row.id);
        contactos[i] = { ...contactos[i], ...row, atualizado_em: new Date() };
        return contactos[i];
      }
      return row;
    }),
    delete: jest.fn(async ({ id }: { id: number }) => {
      const i = contactos.findIndex((r) => r.id === id);
      if (i < 0) return { affected: 0 };
      contactos.splice(i, 1);
      return { affected: 1 };
    }),
    createQueryBuilder: jest.fn(() => ({
      select: () => ({
        getRawOne: async () => ({
          max: contactos.length
            ? String(Math.max(...contactos.map((c) => c.ordem)))
            : null,
        }),
      }),
    })),
    manager: {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<void>) => {
        const update = async (
          where: { id: number },
          data: { ordem: number },
        ) => {
          const row = contactos.find((r) => r.id === where.id);
          if (row) row.ordem = data.ordem;
        };
        await fn({
          getRepository: () => ({ update }),
        });
      }),
    },
  };

  const configRepo = {
    findOne: jest.fn(async () => config),
    create: jest.fn((d: Partial<ConfiguracaoGlobal>) => d as ConfiguracaoGlobal),
    save: jest.fn(async (c: ConfiguracaoGlobal) => {
      config = { ...config, ...c };
      return config;
    }),
  };

  beforeEach(async () => {
    faqs.length = 0;
    contactos.length = 0;
    faqId = 1;
    contactoId = 1;
    config = {
      id: 1,
      salario_minimo_referencia: 1518,
      texto_lgpd: null,
      atualizado_em: new Date(),
    } as ConfiguracaoGlobal;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubService,
        { provide: getRepositoryToken(HubFaqItem), useValue: faqRepo },
        { provide: getRepositoryToken(HubContacto), useValue: contactoRepo },
        {
          provide: getRepositoryToken(ConfiguracaoGlobal),
          useValue: configRepo,
        },
      ],
    }).compile();

    service = module.get(HubService);
  });

  it('getPublic returns only ativos + fixed exclusion email', async () => {
    await service.createFaq({
      pergunta: 'Q1',
      resposta: 'A1',
      ativo: true,
    });
    await service.createFaq({
      pergunta: 'Q2',
      resposta: 'A2',
      ativo: false,
    });
    await service.createContacto({
      titulo: 'Email',
      valor: 'a@b.c',
      tipo: 'email',
    });
    const pub = await service.getPublic();
    expect(pub.faqs).toHaveLength(1);
    expect(pub.contactos).toHaveLength(1);
    expect(pub.texto_lgpd).toBeNull();
    expect(pub.email_exclusao_dados).toBe('reitoria@ifb.edu.br');
  });

  it('rejects invalid contacto tipo', async () => {
    await expect(
      service.createContacto({
        titulo: 'X',
        valor: 'y',
        tipo: 'fax',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateLgpd stores trimmed text or null', async () => {
    expect(await service.updateLgpd({ texto_lgpd: '  Lei 13.709  ' })).toEqual({
      texto_lgpd: 'Lei 13.709',
    });
    expect(await service.updateLgpd({ texto_lgpd: '   ' })).toEqual({
      texto_lgpd: null,
    });
  });

  it('deleteFaq 404 when missing', async () => {
    await expect(service.deleteFaq(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reorderFaqs requires complete permutation', async () => {
    const a = await service.createFaq({ pergunta: 'A', resposta: '1' });
    await service.createFaq({ pergunta: 'B', resposta: '2' });
    await expect(service.reorderFaqs([a.id])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
