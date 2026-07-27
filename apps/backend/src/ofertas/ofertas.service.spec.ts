import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TurnoOferta } from '@repo/types';
import { OfertasService } from './ofertas.service';
import { Oferta } from './entities/oferta.entity';
import { DistribuicaoCota } from '../distribuicao-cotas/entities/distribuicao-cota.entity';
import { CandidaturasService } from '../candidaturas/candidaturas.service';

describe('OfertasService', () => {
  let service: OfertasService;

  const qbChain = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const manager = {
    transaction: jest.fn(async (fn: (em: unknown) => Promise<unknown>) => {
      const em = {
        createQueryBuilder: jest.fn(() => ({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
        create: jest.fn((_Entity: unknown, data: unknown) => data),
        save: jest.fn(async (rows: unknown) => rows),
      };
      return fn(em);
    }),
  };

  const ofertaRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => qbChain),
    manager,
  };

  const cotasRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 99, ...x })),
    createQueryBuilder: jest.fn(() => ({
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    })),
    manager,
  };

  const publishedOferta: Oferta = {
    id: 1,
    id_edital: 1,
    id_curso: 1,
    id_campus: 10,
    turno: TurnoOferta.NOTURNO,
    vagas_totais: 40,
    edital: { id: 1, publicado: true, inscricoes_abertas: true } as Oferta['edital'],
    curso: { id: 1 } as Oferta['curso'],
    campus: { id: 10 } as Oferta['campus'],
    distribuicao_cotas: [
      { id: 1, id_oferta: 1, tipo_cota: 'AC', vagas: 28, percentual: null },
      { id: 2, id_oferta: 1, tipo_cota: 'PPI', vagas: 12, percentual: null },
    ],
  };

  const draftOferta: Oferta = {
    ...publishedOferta,
    id: 2,
    edital: { id: 2, publicado: false, inscricoes_abertas: false } as Oferta['edital'],
    distribuicao_cotas: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    qbChain.leftJoinAndSelect.mockReturnThis();
    qbChain.andWhere.mockReturnThis();
    qbChain.orderBy.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfertasService,
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepo },
        {
          provide: getRepositoryToken(DistribuicaoCota),
          useValue: cotasRepo,
        },
        {
          provide: CandidaturasService,
          useValue: { findByOferta: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OfertasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('public vs draft', () => {
    it('findAllPublic filters publicados=true by default', async () => {
      qbChain.getMany.mockResolvedValue([publishedOferta]);
      await service.findAllPublic();
      expect(qbChain.andWhere).toHaveBeenCalledWith(
        'edital.publicado = true',
      );
    });

    it('findOnePublic hides draft parent edital', async () => {
      ofertaRepo.findOne.mockResolvedValue(draftOferta);
      await expect(service.findOnePublic(2)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('findOnePublic returns published with warnings', async () => {
      ofertaRepo.findOne.mockResolvedValue(publishedOferta);
      const result = await service.findOnePublic(1);
      expect(result.id).toBe(1);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('replaceCotas', () => {
    it('rejects cota without vagas|percentual', async () => {
      ofertaRepo.findOne.mockResolvedValue(publishedOferta);
      await expect(
        service.replaceCotas(1, {
          cotas: [{ tipo_cota: 'AC' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persists replace and returns soft warning when sum ≠ total', async () => {
      ofertaRepo.findOne
        .mockResolvedValueOnce(publishedOferta)
        .mockResolvedValueOnce({
          ...publishedOferta,
          distribuicao_cotas: [
            { id: 10, id_oferta: 1, tipo_cota: 'AC', vagas: 10, percentual: null },
          ],
        });

      const result = await service.replaceCotas(1, {
        cotas: [{ tipo_cota: 'AC', vagas: 10 }],
      });

      expect(manager.transaction).toHaveBeenCalled();
      expect(result.warnings.some((w) => w.code === 'VAGAS_TOTAL_MISMATCH')).toBe(
        true,
      );
    });

    it('returns empty warnings when distribution closes', async () => {
      ofertaRepo.findOne
        .mockResolvedValueOnce(publishedOferta)
        .mockResolvedValueOnce(publishedOferta);

      const result = await service.replaceCotas(1, {
        cotas: [
          { tipo_cota: 'AC', vagas: 28 },
          { tipo_cota: 'PPI', vagas: 12 },
        ],
      });
      expect(result.warnings).toEqual([]);
    });
  });
});
