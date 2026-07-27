import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  EtapaStatusOverride,
  TipoEtapaCronograma,
} from '@repo/types';
import { CronogramaService } from './cronograma.service';
import { CronogramaEtapa } from './entities/cronograma-etapa.entity';
import { Edital } from '../editais/entities/edital.entity';

describe('CronogramaService', () => {
  let service: CronogramaService;

  const publishedEdital = { id: 1, publicado: true } as Edital;
  const draftEdital = { id: 2, publicado: false } as Edital;

  const etapaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 10, id_edital: 1, ...x })),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<unknown>) => {
        const em = {
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        return fn(em);
      }),
    },
  };

  const editalRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronogramaService,
        { provide: getRepositoryToken(CronogramaEtapa), useValue: etapaRepo },
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
      ],
    }).compile();
    service = module.get(CronogramaService);
  });

  it('rejects create when data_fim < data_inicio', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    await expect(
      service.create(1, {
        tipo: TipoEtapaCronograma.INSCRICAO,
        data_inicio: '2026-02-01T00:00:00.000Z',
        data_fim: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create succeeds with DATE_OVERLAP warning when ranges overlap', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    etapaRepo.find
      .mockResolvedValueOnce([]) // append ordem lookup
      .mockResolvedValueOnce([
        {
          id: 1,
          id_edital: 1,
          tipo: TipoEtapaCronograma.INSCRICAO,
          data_inicio: new Date('2026-01-01T00:00:00.000Z'),
          data_fim: new Date('2026-01-20T00:00:00.000Z'),
          ordem: 1,
          override: EtapaStatusOverride.AUTOMATICO,
        },
        {
          id: 10,
          id_edital: 1,
          tipo: TipoEtapaCronograma.HOMOLOGACAO,
          data_inicio: new Date('2026-01-10T00:00:00.000Z'),
          data_fim: new Date('2026-01-30T00:00:00.000Z'),
          ordem: 2,
          override: EtapaStatusOverride.AUTOMATICO,
          elegivel_impugnacao: false,
          elegivel_recurso: false,
          nome_exibido: 'Homologação',
        },
      ]);
    etapaRepo.findOne.mockResolvedValue({
      id: 10,
      id_edital: 1,
      tipo: TipoEtapaCronograma.HOMOLOGACAO,
      data_inicio: new Date('2026-01-10T00:00:00.000Z'),
      data_fim: new Date('2026-01-30T00:00:00.000Z'),
      ordem: 2,
      override: EtapaStatusOverride.AUTOMATICO,
      elegivel_impugnacao: false,
      elegivel_recurso: false,
      nome_exibido: 'Homologação',
    });

    const result = await service.create(1, {
      tipo: TipoEtapaCronograma.HOMOLOGACAO,
      data_inicio: '2026-01-10T00:00:00.000Z',
      data_fim: '2026-01-30T00:00:00.000Z',
    });

    expect(etapaRepo.save).toHaveBeenCalled();
    expect(result.warnings.some((w) => w.code === 'DATE_OVERLAP')).toBe(true);
  });

  it('public list 404s for draft edital', async () => {
    editalRepo.findOne.mockResolvedValue(draftEdital);
    await expect(service.findAllPublic(2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('gestao list works for draft edital', async () => {
    editalRepo.findOne.mockResolvedValue(draftEdital);
    etapaRepo.find.mockResolvedValue([]);
    const result = await service.findAllGestao(2);
    expect(result.etapas).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reorder persists new ordem', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    const rows = [
      {
        id: 1,
        id_edital: 1,
        tipo: TipoEtapaCronograma.INSCRICAO,
        data_inicio: new Date('2026-01-01'),
        data_fim: new Date('2026-01-10'),
        ordem: 1,
        override: EtapaStatusOverride.AUTOMATICO,
      },
      {
        id: 2,
        id_edital: 1,
        tipo: TipoEtapaCronograma.HOMOLOGACAO,
        data_inicio: new Date('2026-01-11'),
        data_fim: new Date('2026-01-20'),
        ordem: 2,
        override: EtapaStatusOverride.AUTOMATICO,
      },
    ];
    etapaRepo.find
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([
        { ...rows[1], ordem: 1 },
        { ...rows[0], ordem: 2 },
      ]);

    const result = await service.reorder(1, [2, 1]);
    expect(etapaRepo.manager.transaction).toHaveBeenCalled();
    expect(result.etapas[0].id).toBe(2);
    expect(result.etapas[0].ordem).toBe(1);
  });
});
