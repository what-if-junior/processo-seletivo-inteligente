import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetodoSelecao, TermosModo } from '@repo/types';
import { EditaisService } from './editais.service';
import { Edital } from './entities/edital.entity';
import { EditalArquivo } from './entities/edital-arquivo.entity';
import { TiposDocumentoBaseService } from '../tipos-documento-base/tipos-documento-base.service';
import { CarrosselService } from '../carrossel/carrossel.service';

describe('EditaisService', () => {
  let service: EditaisService;

  const editalRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };

  const arquivoRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };

  const carrosselService = {
    syncAutoForEdital: jest.fn().mockResolvedValue({ action: 'created' }),
  };

  const draftEdital: Edital = {
    id: 10,
    numero_ano: '001/2026',
    metodo_selecao: MetodoSelecao.ALEATORIO,
    merito_tipo: null,
    is_simplificado: false,
    fallback_ac_para_rv: false,
    termos_modo: TermosModo.URL,
    termos_valor: 'https://example.com/termos.pdf',
    link_oficial: null,
    publicado: false,
    inscricoes_abertas: false,
  };

  const publishedEdital: Edital = {
    ...draftEdital,
    id: 1,
    publicado: true,
    inscricoes_abertas: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();
    qb.orderBy.mockReturnThis();
    qb.addOrderBy.mockReturnThis();
    qb.addSelect.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditaisService,
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
        { provide: getRepositoryToken(EditalArquivo), useValue: arquivoRepo },
        {
          provide: TiposDocumentoBaseService,
          useValue: { inheritIntoEdital: jest.fn().mockResolvedValue([]) },
        },
        { provide: CarrosselService, useValue: carrosselService },
      ],
    }).compile();

    service = module.get(EditaisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('termos one-mode on create', () => {
    it('rejects conflicting termos_pdf channel', async () => {
      await expect(
        service.create(
          {
            numero_ano: '001/2026',
            metodo_selecao: MetodoSelecao.ALEATORIO,
            termos_modo: TermosModo.URL,
            termos_valor: 'https://example.com/t.pdf',
          },
          { termos_pdf: 'also.pdf' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects create with publicado before PDF', async () => {
      await expect(
        service.create({
          numero_ano: '001/2026',
          metodo_selecao: MetodoSelecao.ALEATORIO,
          termos_modo: TermosModo.TEXTO,
          termos_valor: 'Aceito',
          publicado: true,
        }),
      ).rejects.toThrow(/sem PDF/);
    });
  });

  describe('public vs unpublished', () => {
    it('findAllPublic always filters publicado=true', async () => {
      editalRepo.find.mockResolvedValue([publishedEdital]);
      await service.findAllPublic();
      expect(editalRepo.find).toHaveBeenCalledWith({
        where: { publicado: true },
        order: { id: 'ASC' },
      });
    });

    it('findOnePublic hides unpublished with NotFound', async () => {
      editalRepo.findOne.mockResolvedValue(draftEdital);
      await expect(service.findOnePublic(10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('findOnePublic returns published edital', async () => {
      editalRepo.findOne.mockResolvedValue(publishedEdital);
      await expect(service.findOnePublic(1)).resolves.toEqual(publishedEdital);
    });
  });

  describe('PDF vigente = last inserted', () => {
    const pdfBuf = Buffer.from('%PDF-1.4 minimal');

    it('marks only the last uploaded PDF as vigente', async () => {
      editalRepo.findOne.mockResolvedValue(draftEdital);
      arquivoRepo.save.mockResolvedValue({ id: 2 });
      qb.getMany.mockResolvedValue([
        {
          id: 1,
          id_edital: 10,
          criado_em: new Date('2026-01-01'),
        },
        {
          id: 2,
          id_edital: 10,
          criado_em: new Date('2026-01-02'),
        },
      ]);

      const meta = await service.uploadArquivo(10, {
        buffer: pdfBuf,
        mimetype: 'application/pdf',
      });

      expect(arquivoRepo.create).toHaveBeenCalledWith({
        arquivo: pdfBuf,
        edital: { id: 10 },
      });
      expect(meta.vigente).toBe(true);
      expect(meta.id).toBe(2);

      const list = await service.listArquivos(10);
      expect(list.map((a) => a.vigente)).toEqual([false, true]);
      expect(list[1].id).toBe(2);
    });

    it('getVigenteArquivo returns the newest row', async () => {
      editalRepo.findOne.mockResolvedValue(publishedEdital);
      qb.getOne.mockResolvedValue({
        id: 99,
        id_edital: 1,
        criado_em: new Date('2026-07-01'),
        arquivo: pdfBuf,
      });

      const { meta, buffer } = await service.getVigenteArquivo(1);
      expect(meta.vigente).toBe(true);
      expect(meta.id).toBe(99);
      expect(buffer).toBe(pdfBuf);
      expect(qb.orderBy).toHaveBeenCalledWith('a.criado_em', 'DESC');
    });

    it('rejects non-PDF uploads', async () => {
      editalRepo.findOne.mockResolvedValue(draftEdital);
      await expect(
        service.uploadArquivo(10, {
          buffer: Buffer.from('not-pdf'),
          mimetype: 'application/pdf',
        }),
      ).rejects.toThrow(/PDF válido/);
    });
  });

  describe('publish requires PDF', () => {
    it('blocks publicado=true when history is empty', async () => {
      editalRepo.findOne.mockResolvedValue(draftEdital);
      qb.getCount.mockResolvedValue(0);

      await expect(
        service.update(10, { publicado: true }),
      ).rejects.toThrow(/ao menos um PDF/);
    });

    it('allows publish when at least one PDF exists', async () => {
      editalRepo.findOne.mockResolvedValue(draftEdital);
      qb.getCount.mockResolvedValue(1);
      editalRepo.save.mockImplementation(async (e) => e);

      const result = await service.update(10, { publicado: true });
      expect(result.publicado).toBe(true);
      expect(carrosselService.syncAutoForEdital).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10, publicado: true }),
      );
    });
  });
});
