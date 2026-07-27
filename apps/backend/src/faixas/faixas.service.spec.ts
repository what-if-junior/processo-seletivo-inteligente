import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaixasService } from './faixas.service';
import { FaixaSalarioMinimo } from './entities/faixa-salario-minimo.entity';
import { ConfiguracaoGlobal } from './entities/configuracao-global.entity';

describe('FaixasService', () => {
  let service: FaixasService;
  let liveConfig: ConfiguracaoGlobal;

  const faixaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: x.id ?? 10, ...x })),
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

  const configRepo = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    liveConfig = {
      id: 1,
      salario_minimo_referencia: 1518,
      atualizado_em: new Date(),
    } as ConfiguracaoGlobal;
    configRepo.findOne.mockImplementation(async () => liveConfig);
    configRepo.save.mockImplementation(async (x) => {
      liveConfig = { ...liveConfig, ...x };
      return liveConfig;
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaixasService,
        { provide: getRepositoryToken(FaixaSalarioMinimo), useValue: faixaRepo },
        {
          provide: getRepositoryToken(ConfiguracaoGlobal),
          useValue: configRepo,
        },
      ],
    }).compile();
    service = module.get(FaixasService);
  });

  it('public list: regra B true when no active bands', async () => {
    faixaRepo.find.mockResolvedValue([
      {
        id: 1,
        ordem: 1,
        rotulo: 'Old',
        ativo: false,
        criado_em: new Date(),
      },
    ]);
    const result = await service.findPublic();
    expect(result.faixas).toEqual([]);
    expect(result.regra_b_socioeconomico).toBe(true);
    expect(result.warnings.some((w) => w.code === 'FAIXAS_ATIVAS_VAZIAS')).toBe(
      true,
    );
    expect(result.salario_minimo_referencia).toBe(1518);
  });

  it('public list: regra B false when active bands exist', async () => {
    const active = {
      id: 2,
      ordem: 1,
      rotulo: 'Até 1 SM',
      ativo: true,
      multiplicador_min: 0,
      multiplicador_max: 1,
      criado_em: new Date(),
    };
    faixaRepo.find.mockResolvedValue([
      active,
      { id: 1, ordem: 2, rotulo: 'Off', ativo: false, criado_em: new Date() },
    ]);
    const result = await service.findPublic();
    expect(result.faixas).toEqual([active]);
    expect(result.regra_b_socioeconomico).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it('updates SM referência', async () => {
    faixaRepo.find.mockResolvedValue([]);
    const result = await service.updateReferencia(1621);
    expect(configRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ salario_minimo_referencia: 1621 }),
    );
    expect(result.salario_minimo_referencia).toBe(1621);
  });

  it('rejects negative SM referência', async () => {
    await expect(service.updateReferencia(-10)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates faixa appending ordem and returns detail', async () => {
    faixaRepo.find
      .mockResolvedValueOnce([]) // max ordem lookup
      .mockResolvedValueOnce([
        {
          id: 10,
          ordem: 1,
          rotulo: 'Até 1 SM',
          ativo: true,
          multiplicador_min: 0,
          multiplicador_max: 1,
          criado_em: new Date(),
        },
      ]);
    faixaRepo.findOne.mockResolvedValue({
      id: 10,
      ordem: 1,
      rotulo: 'Até 1 SM',
      ativo: true,
      multiplicador_min: 0,
      multiplicador_max: 1,
      criado_em: new Date(),
    });

    const result = await service.create({
      rotulo: 'Até 1 SM',
      multiplicador_min: 0,
      multiplicador_max: 1,
    });

    expect(faixaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        rotulo: 'Até 1 SM',
        ordem: 1,
        ativo: true,
      }),
    );
    expect(result.regra_b_socioeconomico).toBe(false);
  });

  it('rejects create when multiplicador_min > max', async () => {
    await expect(
      service.create({
        rotulo: 'Bad',
        multiplicador_min: 3,
        multiplicador_max: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty rotulo', async () => {
    await expect(service.create({ rotulo: '  ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('soft remove sets ativo=false and keeps regra B if last active', async () => {
    faixaRepo.findOne.mockResolvedValue({
      id: 5,
      ordem: 1,
      rotulo: 'Only',
      ativo: true,
    });
    faixaRepo.find.mockResolvedValue([
      { id: 5, ordem: 1, rotulo: 'Only', ativo: false },
    ]);
    faixaRepo.save.mockImplementation(async (x) => x);

    const result = await service.remove(5, false);
    expect(faixaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, ativo: false }),
    );
    expect(faixaRepo.delete).not.toHaveBeenCalled();
    expect(result.regra_b_socioeconomico).toBe(true);
  });

  it('hard remove deletes row', async () => {
    faixaRepo.findOne.mockResolvedValue({ id: 5, ativo: true });
    faixaRepo.find.mockResolvedValue([]);
    const result = await service.remove(5, true);
    expect(faixaRepo.delete).toHaveBeenCalledWith({ id: 5 });
    expect(result.regra_b_socioeconomico).toBe(true);
  });

  it('reorder updates ordem in two phases', async () => {
    const rows = [
      { id: 1, ordem: 1, rotulo: 'A', ativo: true },
      { id: 2, ordem: 2, rotulo: 'B', ativo: true },
    ];
    faixaRepo.find
      .mockResolvedValueOnce(rows) // existing check
      .mockResolvedValueOnce([
        { id: 2, ordem: 1, rotulo: 'B', ativo: true },
        { id: 1, ordem: 2, rotulo: 'A', ativo: true },
      ]);

    const result = await service.reorder([2, 1]);
    expect(faixaRepo.manager.transaction).toHaveBeenCalled();
    expect(result.faixas.map((f) => f.id)).toEqual([2, 1]);
  });

  it('reorder rejects incomplete id list', async () => {
    faixaRepo.find.mockResolvedValue([
      { id: 1, ordem: 1, rotulo: 'A', ativo: true },
      { id: 2, ordem: 2, rotulo: 'B', ativo: true },
    ]);
    await expect(service.reorder([1])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('findOneGestao 404s for missing faixa', async () => {
    faixaRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneGestao(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
