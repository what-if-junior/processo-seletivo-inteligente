import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CampoFormularioTipo, FaseDocumento } from '@repo/types';
import { TiposDocumentoService } from './tipos-documento.service';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { TipoDocumentoCampo } from './entities/tipo-documento-campo.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';

describe('TiposDocumentoService', () => {
  let service: TiposDocumentoService;

  const publishedEdital = { id: 1, publicado: true } as Edital;
  const draftEdital = { id: 2, publicado: false } as Edital;

  const tipoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 10, id_edital: 1, ...x })),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const campoRepo = {
    manager: {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<unknown>) => {
        const em = {
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
          create: jest.fn((_e: unknown, x: unknown) => x),
          save: jest.fn(async (x: unknown) => x),
        };
        return fn(em);
      }),
    },
  };

  const editalRepo = { findOne: jest.fn() };
  const candidaturaRepo = { count: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    candidaturaRepo.count.mockResolvedValue(0);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposDocumentoService,
        { provide: getRepositoryToken(TipoDocumento), useValue: tipoRepo },
        {
          provide: getRepositoryToken(TipoDocumentoCampo),
          useValue: campoRepo,
        },
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
        {
          provide: getRepositoryToken(Candidatura),
          useValue: candidaturaRepo,
        },
      ],
    }).compile();
    service = module.get(TiposDocumentoService);
  });

  it('public list 404s for draft edital', async () => {
    editalRepo.findOne.mockResolvedValue(draftEdital);
    await expect(service.findAllPublic(2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects tamanho_max_bytes above backend ceiling', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    await expect(
      service.create(1, {
        nome: 'RG',
        fase: FaseDocumento.INSCRICAO,
        tamanho_max_bytes: 20 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create succeeds and warns when inscriptions exist', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    candidaturaRepo.count.mockResolvedValue(2);
    tipoRepo.find.mockResolvedValueOnce([]); // ordem append
    tipoRepo.findOne.mockResolvedValue({
      id: 10,
      id_edital: 1,
      nome: 'RG',
      fase: FaseDocumento.INSCRICAO,
      obrigatorio: true,
      formatos: ['pdf'],
      tamanho_max_bytes: 1024,
      tipo_cota: null,
      ordem: 1,
      campos: [],
    });

    const result = await service.create(1, {
      nome: 'RG',
      fase: FaseDocumento.INSCRICAO,
      tamanho_max_bytes: 1024,
    });

    expect(tipoRepo.save).toHaveBeenCalled();
    expect(
      result.warnings.some((w) => w.code === 'CATALOGUE_CHANGE_WITH_INSCRICOES'),
    ).toBe(true);
    expect(result.warnings[0].inscricoes_count).toBe(2);
  });

  it('replaceCampos persists builder fields', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    tipoRepo.findOne.mockResolvedValue({
      id: 1,
      id_edital: 1,
      nome: 'RG',
      fase: FaseDocumento.INSCRICAO,
      campos: [],
      formatos: ['pdf'],
      tamanho_max_bytes: 1024,
      obrigatorio: true,
      ordem: 1,
    });

    const result = await service.replaceCampos(1, 1, {
      campos: [
        {
          tipo: CampoFormularioTipo.TEXTO,
          rotulo: 'Número',
          obrigatorio: true,
        },
        {
          tipo: CampoFormularioTipo.DOCUMENTO,
          rotulo: 'Arquivo',
          formatos: ['pdf'],
          tamanho_max_bytes: 2048,
        },
      ],
    });

    expect(campoRepo.manager.transaction).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('associates optional tipo_cota', async () => {
    editalRepo.findOne.mockResolvedValue(publishedEdital);
    tipoRepo.find.mockResolvedValueOnce([]);
    tipoRepo.findOne.mockResolvedValue({
      id: 10,
      id_edital: 1,
      nome: 'Renda',
      fase: FaseDocumento.INSCRICAO,
      tipo_cota: 'BAIXA_RENDA',
      campos: [],
      formatos: ['pdf'],
      tamanho_max_bytes: 1024,
      obrigatorio: true,
      ordem: 1,
    });

    const result = await service.create(1, {
      nome: 'Renda',
      fase: FaseDocumento.INSCRICAO,
      tipo_cota: 'BAIXA_RENDA',
      tamanho_max_bytes: 1024,
    });

    expect(tipoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_cota: 'BAIXA_RENDA' }),
    );
    expect(result.tipo_cota).toBe('BAIXA_RENDA');
  });
});
