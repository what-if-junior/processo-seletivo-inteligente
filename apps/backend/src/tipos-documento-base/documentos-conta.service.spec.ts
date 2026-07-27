import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaseDocumento } from '@repo/types';
import { DocumentosContaService } from './documentos-conta.service';
import { DocumentoConta } from './entities/documento-conta.entity';
import { TipoDocumentoBase } from './entities/tipo-documento-base.entity';

describe('DocumentosContaService', () => {
  let service: DocumentosContaService;

  const docRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: x.id ?? 7, ...x })),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const baseRepo = {
    findOne: jest.fn(),
  };

  const base = {
    id: 1,
    nome: 'RG',
    ativo: true,
    formatos: ['pdf'],
    tamanho_max_bytes: 1024,
    fase: FaseDocumento.INSCRICAO,
  } as TipoDocumentoBase;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosContaService,
        { provide: getRepositoryToken(DocumentoConta), useValue: docRepo },
        { provide: getRepositoryToken(TipoDocumentoBase), useValue: baseRepo },
      ],
    }).compile();
    service = module.get(DocumentosContaService);
  });

  it('upsert creates file-per-type for user', async () => {
    baseRepo.findOne.mockResolvedValue(base);
    docRepo.findOne
      .mockResolvedValueOnce(null) // no existing
      .mockResolvedValueOnce({
        id: 7,
        id_usuario: 3,
        id_tipo_base: 1,
        nome_arquivo: 'rg.pdf',
        mime: 'application/pdf',
        atualizado_em: new Date(),
        tipoBase: base,
      });

    const file = {
      buffer: Buffer.from('%PDF'),
      size: 4,
      originalname: 'rg.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    const result = await service.upsert(3, 1, file);
    expect(result.id_tipo_base).toBe(1);
    expect(result.nome_arquivo).toBe('rg.pdf');
    expect(docRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: 3,
        id_tipo_base: 1,
      }),
    );
  });

  it('upsert rejects missing file', async () => {
    baseRepo.findOne.mockResolvedValue(base);
    await expect(service.upsert(3, 1, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('download 404s when missing', async () => {
    docRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    await expect(service.download(3, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
