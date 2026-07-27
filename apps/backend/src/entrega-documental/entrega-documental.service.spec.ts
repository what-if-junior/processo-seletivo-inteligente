import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModoEntrega, SubtipoEntregaOnline } from '@repo/types';
import { EntregaDocumentalService } from './entrega-documental.service';
import { ConfiguracaoEntregaDocumental } from './entities/configuracao-entrega-documental.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Campus } from '../campus/entities/campus.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { CronogramaEtapa } from '../cronograma/entities/cronograma-etapa.entity';

describe('EntregaDocumentalService', () => {
  let service: EntregaDocumentalService;

  const publishedEdital = { id: 1, publicado: true } as Edital;
  const draftEdital = { id: 2, publicado: false } as Edital;

  const entregaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 5, id_edital: 1, ...x })),
    delete: jest.fn(),
  };
  const editalRepo = { findOne: jest.fn() };
  const campusRepo = { findOne: jest.fn() };
  const cursoRepo = { findOne: jest.fn() };
  const etapaRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    campusRepo.findOne.mockResolvedValue({ id: 10 });
    cursoRepo.findOne.mockResolvedValue({ id: 1 });
    etapaRepo.findOne.mockResolvedValue({ id: 4, id_edital: 1 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntregaDocumentalService,
        {
          provide: getRepositoryToken(ConfiguracaoEntregaDocumental),
          useValue: entregaRepo,
        },
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
        { provide: getRepositoryToken(Campus), useValue: campusRepo },
        { provide: getRepositoryToken(Curso), useValue: cursoRepo },
        { provide: getRepositoryToken(CronogramaEtapa), useValue: etapaRepo },
      ],
    }).compile();
    service = module.get(EntregaDocumentalService);
  });

  it('public list 404s for draft edital', async () => {
    editalRepo.findOne.mockResolvedValue(draftEdital);
    await expect(service.findAllPublic(2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects ONLINE without subtipo', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    await expect(
      service.create(1, {
        id_campus: 10,
        id_curso: 1,
        id_cronograma_etapa: 4,
        modo: ModoEntrega.ONLINE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects PRESENCIAL without endereco', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    await expect(
      service.create(1, {
        id_campus: 10,
        id_curso: 1,
        id_cronograma_etapa: 4,
        modo: ModoEntrega.PRESENCIAL,
        local_nome: 'Secretaria',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects etapa not owned by edital', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    etapaRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create(1, {
        id_campus: 10,
        id_curso: 1,
        id_cronograma_etapa: 99,
        modo: ModoEntrega.ONLINE,
        subtipo_online: SubtipoEntregaOnline.UPLOAD_NATIVO_PWA,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate vínculo', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    entregaRepo.findOne.mockResolvedValue({ id: 1 });
    await expect(
      service.create(1, {
        id_campus: 10,
        id_curso: 1,
        id_cronograma_etapa: 4,
        modo: ModoEntrega.ONLINE,
        subtipo_online: SubtipoEntregaOnline.UPLOAD_NATIVO_PWA,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates PRESENCIAL with uploads_ocultos true', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    entregaRepo.findOne
      .mockResolvedValueOnce(null) // dup check
      .mockResolvedValueOnce({
        id: 5,
        id_edital: 1,
        id_campus: 10,
        id_curso: 1,
        id_cronograma_etapa: 4,
        modo: ModoEntrega.PRESENCIAL,
        local_nome: 'Secretaria',
        endereco: 'Rua A',
      });

    const result = await service.create(1, {
      id_campus: 10,
      id_curso: 1,
      id_cronograma_etapa: 4,
      modo: ModoEntrega.PRESENCIAL,
      local_nome: 'Secretaria',
      endereco: 'Rua A',
    });

    expect(entregaRepo.save).toHaveBeenCalled();
    expect(result.uploads_ocultos).toBe(true);
  });
});
