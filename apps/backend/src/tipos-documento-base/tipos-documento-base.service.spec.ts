import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaseDocumento } from '@repo/types';
import { TiposDocumentoBaseService } from './tipos-documento-base.service';
import { TipoDocumentoBase } from './entities/tipo-documento-base.entity';
import { TipoDocumento } from '../tipos-documento/entities/tipo-documento.entity';
import { DocumentoConta } from './entities/documento-conta.entity';

describe('TiposDocumentoBaseService', () => {
  let service: TiposDocumentoBaseService;

  const baseRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: x.id ?? 10, ...x })),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const tipoEditalRepo = {
    count: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 100, id_edital: 5, ...x })),
  };

  const docContaRepo = {
    count: jest.fn(),
  };

  const activeBases: TipoDocumentoBase[] = [
    {
      id: 1,
      nome: 'RG',
      descricao: null,
      obrigatorio: true,
      formatos: ['pdf'],
      tamanho_max_bytes: 1024,
      fase: FaseDocumento.INSCRICAO,
      ordem: 1,
      ativo: true,
      criado_em: new Date(),
    } as TipoDocumentoBase,
    {
      id: 2,
      nome: 'Residencia',
      descricao: null,
      obrigatorio: false,
      formatos: ['pdf'],
      tamanho_max_bytes: 2048,
      fase: FaseDocumento.INSCRICAO,
      ordem: 2,
      ativo: true,
      criado_em: new Date(),
    } as TipoDocumentoBase,
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    tipoEditalRepo.count.mockResolvedValue(0);
    docContaRepo.count.mockResolvedValue(0);

    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(activeBases),
      getOne: jest.fn(),
    };
    baseRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposDocumentoBaseService,
        { provide: getRepositoryToken(TipoDocumentoBase), useValue: baseRepo },
        { provide: getRepositoryToken(TipoDocumento), useValue: tipoEditalRepo },
        { provide: getRepositoryToken(DocumentoConta), useValue: docContaRepo },
      ],
    }).compile();
    service = module.get(TiposDocumentoBaseService);
  });

  it('remove blocked when linked to editais', async () => {
    baseRepo.findOne.mockResolvedValue(activeBases[0]);
    tipoEditalRepo.count.mockResolvedValue(3);

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(baseRepo.delete).not.toHaveBeenCalled();
  });

  it('remove succeeds when unlinked', async () => {
    baseRepo.findOne.mockResolvedValue(activeBases[0]);
    tipoEditalRepo.count.mockResolvedValue(0);
    docContaRepo.count.mockResolvedValue(0);

    const result = await service.remove(1);
    expect(baseRepo.delete).toHaveBeenCalledWith({ id: 1 });
    expect(result.vinculados_count).toBe(0);
  });

  it('inheritIntoEdital copies all active when ids omitted', async () => {
    baseRepo.find.mockResolvedValue(activeBases);

    const created = await service.inheritIntoEdital(5);
    expect(created).toHaveLength(2);
    expect(tipoEditalRepo.create).toHaveBeenCalledTimes(2);
    expect(tipoEditalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'RG',
        id_edital: 5,
        id_tipo_base: 1,
      }),
    );
  });

  it('inheritIntoEdital respects deselect (subset / empty)', async () => {
    baseRepo.find.mockResolvedValue(activeBases);

    const none = await service.inheritIntoEdital(5, []);
    expect(none).toEqual([]);
    expect(tipoEditalRepo.save).not.toHaveBeenCalled();

    jest.clearAllMocks();
    baseRepo.find.mockResolvedValue(activeBases);
    baseRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([activeBases[1]]),
    });

    const one = await service.inheritIntoEdital(5, [2]);
    expect(one).toHaveLength(1);
    expect(tipoEditalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_tipo_base: 2, nome: 'Residencia', id_edital: 5 }),
    );
  });

  it('findOneGestao 404s missing', async () => {
    baseRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneGestao(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
