import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusDocumento } from '@repo/types';
import { Documento } from './entities/documento.entity';
import { DocumentosService } from './documentos.service';

describe('DocumentosService', () => {
  let service: DocumentosService;
  const save = jest.fn();
  const create = jest.fn((row: unknown) => row);
  const find = jest.fn();
  const findOne = jest.fn();

  beforeEach(async () => {
    save.mockReset();
    create.mockClear();
    find.mockReset();
    findOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        {
          provide: getRepositoryToken(Documento),
          useValue: { save, create, find, findOne },
        },
      ],
    }).compile();

    service = module.get(DocumentosService);
  });

  it('creates a documento from multipart payload', async () => {
    save.mockImplementation(async (row: Documento) => ({ ...row, id: 9 }));

    const result = await service.create({
      id_candidatura: 1,
      tipo_documento: 'CPF',
      nome_arquivo: 'cpf.pdf',
      arquivo: Buffer.from('pdf-bytes'),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_documento: 'CPF',
        nome_arquivo: 'cpf.pdf',
        status_documento: StatusDocumento.EM_ANALISE,
      }),
    );
    expect(result.id).toBe(9);
    expect((result as Documento & { arquivo?: Buffer }).arquivo).toBeUndefined();
  });

  it('rejects empty or oversized uploads', async () => {
    await expect(
      service.create({
        id_candidatura: 1,
        tipo_documento: 'CPF',
        nome_arquivo: 'x.pdf',
        arquivo: Buffer.alloc(0),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        id_candidatura: 1,
        tipo_documento: 'CPF',
        nome_arquivo: 'x.pdf',
        arquivo: Buffer.alloc(5 * 1024 * 1024 + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
