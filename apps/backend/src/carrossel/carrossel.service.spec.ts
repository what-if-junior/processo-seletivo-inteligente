import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TipoCarrossel } from '@repo/types';
import { CarrosselService } from './carrossel.service';
import { CarrosselItem } from './entities/carrossel-item.entity';
import { Edital } from '../editais/entities/edital.entity';
import {
  ERR_CARROSSEL_AUTO_DELETE_FORBIDDEN,
  ERR_CARROSSEL_REORDER_INCOMPLETO,
} from './carrossel-visibility.util';

describe('CarrosselService', () => {
  let service: CarrosselService;
  let items: CarrosselItem[];
  let nextId: number;

  const itemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x: Partial<CarrosselItem>) => ({ ...x })),
    save: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<unknown>) => {
        const em = {
          update: jest.fn().mockImplementation(async (_e, where, patch) => {
            const row = items.find((i) => i.id === where.id);
            if (row && patch.ordem != null) row.ordem = patch.ordem;
            return { affected: 1 };
          }),
        };
        return fn(em);
      }),
    },
  };

  const editalRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  function makeItem(
    partial: Partial<CarrosselItem> & { titulo: string },
  ): CarrosselItem {
    return {
      id: partial.id ?? nextId++,
      tipo: partial.tipo ?? TipoCarrossel.MANUAL,
      rotulo: partial.rotulo ?? null,
      titulo: partial.titulo,
      subtitulo: partial.subtitulo ?? null,
      cta_texto: partial.cta_texto ?? null,
      cta_link: partial.cta_link ?? null,
      imagem_url: partial.imagem_url ?? null,
      icone: partial.icone ?? 'GraduationCap',
      ordem: partial.ordem ?? 1,
      ativo: partial.ativo ?? true,
      id_edital: partial.id_edital ?? null,
      auto_edital_habilitado: partial.auto_edital_habilitado ?? true,
      inicio_em: partial.inicio_em ?? null,
      fim_em: partial.fim_em ?? null,
      criado_em: partial.criado_em ?? new Date(),
      atualizado_em: partial.atualizado_em ?? new Date(),
    } as CarrosselItem;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    items = [];
    nextId = 1;

    itemRepo.find.mockImplementation(async (opts?: { order?: unknown; take?: number }) => {
      const sorted = items
        .slice()
        .sort((a, b) => a.ordem - b.ordem || a.id - b.id);
      if (opts && 'take' in (opts as object) && (opts as { take?: number }).take) {
        const take = (opts as { take: number }).take;
        const order = (opts as { order?: { ordem?: string } }).order;
        if (order?.ordem === 'DESC') {
          return items
            .slice()
            .sort((a, b) => b.ordem - a.ordem || b.id - a.id)
            .slice(0, take);
        }
        return sorted.slice(0, take);
      }
      return sorted;
    });
    itemRepo.findOne.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      return (
        items.find((i) =>
          Object.entries(where).every(([k, v]) => (i as never)[k] === v),
        ) ?? null
      );
    });
    itemRepo.save.mockImplementation(async (x: CarrosselItem) => {
      if (!x.id) {
        const saved = { ...x, id: nextId++ } as CarrosselItem;
        items.push(saved);
        return saved;
      }
      const idx = items.findIndex((i) => i.id === x.id);
      if (idx >= 0) items[idx] = x;
      else items.push(x);
      return x;
    });
    itemRepo.delete.mockImplementation(async ({ id }: { id: number }) => {
      items = items.filter((i) => i.id !== id);
      return { affected: 1 };
    });

    editalRepo.find.mockResolvedValue([]);
    editalRepo.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarrosselService,
        { provide: getRepositoryToken(CarrosselItem), useValue: itemRepo },
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
      ],
    }).compile();
    service = module.get(CarrosselService);
  });

  it('manual create appears in public when ativo + schedule open', async () => {
    const created = await service.createManual({
      titulo: 'Campanha',
      rotulo: 'Destaque',
    });
    expect(created.tipo).toBe(TipoCarrossel.MANUAL);
    const pub = await service.findPublic();
    expect(pub.some((p) => p.id === created.id)).toBe(true);
  });

  it('out-of-window / ativo=false excluded from public, present in gestao', async () => {
    const future = makeItem({
      id: 1,
      titulo: 'Future',
      ordem: 1,
      inicio_em: new Date('2099-01-01'),
    });
    const inactive = makeItem({
      id: 2,
      titulo: 'Off',
      ordem: 2,
      ativo: false,
    });
    items.push(future, inactive);
    nextId = 3;

    const pub = await service.findPublic(new Date('2026-08-02'));
    expect(pub).toEqual([]);
    const gestao = await service.findGestao();
    expect(gestao.map((g) => g.id).sort()).toEqual([1, 2]);
  });

  it('auto sync creates one row; second sync idempotent; never re-enables', async () => {
    const edital = {
      id: 10,
      numero_ano: '001/2026',
      publicado: true,
      inscricoes_abertas: true,
    } as Edital;
    editalRepo.findOne.mockResolvedValue(edital);
    editalRepo.find.mockResolvedValue([edital]);

    const r1 = await service.sincronizarAuto();
    expect(r1.created).toBe(1);
    expect(items).toHaveLength(1);
    expect(items[0].tipo).toBe(TipoCarrossel.AUTO_EDITAL);

    const r2 = await service.sincronizarAuto();
    expect(r2.created).toBe(0);
    expect(r2.updated).toBe(1);
    expect(items).toHaveLength(1);

    items[0].auto_edital_habilitado = false;
    const r3 = await service.sincronizarAuto();
    expect(r3.skipped_disabled).toBe(1);
    expect(items[0].auto_edital_habilitado).toBe(false);

    editalRepo.find.mockResolvedValue([edital]);
    const pub = await service.findPublic();
    expect(pub).toEqual([]);
  });

  it('edital closed excludes auto from public', async () => {
    items.push(
      makeItem({
        id: 5,
        tipo: TipoCarrossel.AUTO_EDITAL,
        titulo: '001/2026',
        id_edital: 10,
        ordem: 1,
        auto_edital_habilitado: true,
      }),
    );
    editalRepo.find.mockResolvedValue([
      {
        id: 10,
        numero_ano: '001/2026',
        publicado: true,
        inscricoes_abertas: false,
      },
    ]);
    const pub = await service.findPublic();
    expect(pub).toEqual([]);
  });

  it('reorder complete OK; incomplete rejects', async () => {
    items.push(
      makeItem({ id: 1, titulo: 'A', ordem: 1 }),
      makeItem({ id: 2, titulo: 'B', ordem: 2 }),
    );
    await service.reorder([2, 1]);
    expect(items.find((i) => i.id === 2)!.ordem).toBe(1);
    expect(items.find((i) => i.id === 1)!.ordem).toBe(2);

    await expect(service.reorder([1])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    try {
      await service.reorder([1]);
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ code: ERR_CARROSSEL_REORDER_INCOMPLETO }),
      );
    }
  });

  it('DELETE auto → forbidden', async () => {
    items.push(
      makeItem({
        id: 9,
        tipo: TipoCarrossel.AUTO_EDITAL,
        titulo: 'X',
        id_edital: 1,
        ordem: 1,
      }),
    );
    await expect(service.remove(9)).rejects.toBeInstanceOf(BadRequestException);
    try {
      await service.remove(9);
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ code: ERR_CARROSSEL_AUTO_DELETE_FORBIDDEN }),
      );
    }
  });

  it('remove missing → 404', async () => {
    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
