import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaseDocumento, StatusCandidatura, StatusDocumento } from '@repo/types';
import { Documento } from './entities/documento.entity';
import { DocumentoAuditoria } from './entities/documento-auditoria.entity';
import { MotivoHomologacaoDocumento } from './entities/motivo-homologacao-documento.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import { Notificacao } from '../notificacoes/entities/notificacao.entity';
import { NotificacaoLeitura } from '../notificacoes/entities/notificacao-leitura.entity';
import { TipoDocumento } from '../tipos-documento/entities/tipo-documento.entity';
import { DocumentosContaService } from '../tipos-documento-base/documentos-conta.service';
import { DocumentosService } from './documentos.service';

describe('DocumentosService', () => {
  let service: DocumentosService;

  const saveDoc = jest.fn();
  const createDoc = jest.fn((row: unknown) => row);
  const findDoc = jest.fn();
  const findOneDoc = jest.fn();
  const createQueryBuilder = jest.fn();

  const saveAudit = jest.fn(async (row: unknown) => row);
  const createAudit = jest.fn((row: unknown) => row);

  const findMotivo = jest.fn();
  const findOneMotivo = jest.fn();

  const findOneCand = jest.fn();

  const findTipo = jest.fn();
  const findOneTipo = jest.fn();

  const listForUser = jest.fn();
  const loadArquivoOwned = jest.fn();
  const upsertFromBuffer = jest.fn();

  const saveNotif = jest.fn(async (row: unknown) => ({ ...(row as object), id: 77 }));
  const createNotif = jest.fn((row: unknown) => row);
  const saveLeitura = jest.fn(async (row: unknown) => row);
  const createLeitura = jest.fn((row: unknown) => row);

  const getJanelaPorTipo = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    getJanelaPorTipo.mockResolvedValue({ aberta: true, etapa: { id: 1 } });
    listForUser.mockResolvedValue({ documentos: [] });
    upsertFromBuffer.mockResolvedValue({ id: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        {
          provide: getRepositoryToken(Documento),
          useValue: {
            save: saveDoc,
            create: createDoc,
            find: findDoc,
            findOne: findOneDoc,
            createQueryBuilder,
          },
        },
        {
          provide: getRepositoryToken(DocumentoAuditoria),
          useValue: { save: saveAudit, create: createAudit },
        },
        {
          provide: getRepositoryToken(MotivoHomologacaoDocumento),
          useValue: { find: findMotivo, findOne: findOneMotivo },
        },
        {
          provide: getRepositoryToken(Candidatura),
          useValue: { findOne: findOneCand },
        },
        {
          provide: getRepositoryToken(Notificacao),
          useValue: { save: saveNotif, create: createNotif },
        },
        {
          provide: getRepositoryToken(NotificacaoLeitura),
          useValue: { save: saveLeitura, create: createLeitura },
        },
        {
          provide: getRepositoryToken(TipoDocumento),
          useValue: { find: findTipo, findOne: findOneTipo },
        },
        {
          provide: DocumentosContaService,
          useValue: { listForUser, loadArquivoOwned, upsertFromBuffer },
        },
        {
          provide: CronogramaService,
          useValue: { getJanelaPorTipo },
        },
      ],
    }).compile();

    service = module.get(DocumentosService);
  });

  function stubCandidatura(
    overrides: Partial<Candidatura> = {},
  ): Candidatura {
    return {
      id: 1,
      id_usuario: 10,
      id_edital: 5,
      id_oferta: 2,
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      ...overrides,
    } as Candidatura;
  }

  it('creates a documento from multipart payload', async () => {
    findOneCand.mockResolvedValue(stubCandidatura());
    findOneDoc.mockResolvedValue(null);
    saveDoc.mockImplementation(async (row: Documento) => ({ ...row, id: 9 }));

    const result = await service.create({
      id_candidatura: 1,
      tipo_documento: 'CPF',
      nome_arquivo: 'cpf.pdf',
      arquivo: Buffer.from('pdf-bytes'),
      mime: 'application/pdf',
      id_usuario: 10,
    });

    expect(createDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_documento: 'CPF',
        nome_arquivo: 'cpf.pdf',
        status_documento: StatusDocumento.EM_ANALISE,
        mime: 'application/pdf',
      }),
    );
    expect(result.id).toBe(9);
    expect((result as Documento & { arquivo?: Buffer }).arquivo).toBeUndefined();
    expect(saveAudit).toHaveBeenCalled();
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
        mime: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks matrícula upload when candidatura not approved', async () => {
    findOneCand.mockResolvedValue(stubCandidatura());
    await expect(
      service.create({
        id_candidatura: 1,
        tipo_documento: 'Comprovante matrícula',
        nome_arquivo: 'm.pdf',
        arquivo: Buffer.from('x'),
        mime: 'application/pdf',
        fase: FaseDocumento.MATRICULA,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks upload when documentation window closed', async () => {
    findOneCand.mockResolvedValue(stubCandidatura());
    getJanelaPorTipo.mockResolvedValue({ aberta: false, etapa: null });
    await expect(
      service.create({
        id_candidatura: 1,
        tipo_documento: 'CPF',
        nome_arquivo: 'c.pdf',
        arquivo: Buffer.from('x'),
        mime: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('replaces non-homologated doc and writes audit', async () => {
    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 3,
        id_candidatura: 1,
        tipo_documento: 'CPF',
        nome_arquivo: 'old.pdf',
        status_documento: StatusDocumento.REPROVADO,
        fase: FaseDocumento.INSCRICAO,
        candidatura: stubCandidatura(),
        arquivo: Buffer.from('old'),
      }),
    };
    createQueryBuilder.mockReturnValue(qb);
    saveDoc.mockImplementation(async (row: Documento) => row);

    const result = await service.replace(3, {
      nome_arquivo: 'new.pdf',
      arquivo: Buffer.from('new'),
      mime: 'application/pdf',
      id_usuario: 10,
    });

    expect(result.status_documento).toBe(StatusDocumento.EM_ANALISE);
    expect(saveAudit).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'replace' }),
    );
  });

  it('rejects replace of homologated document', async () => {
    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 3,
        id_candidatura: 1,
        status_documento: StatusDocumento.APROVADO,
        fase: FaseDocumento.INSCRICAO,
        candidatura: stubCandidatura(),
        arquivo: Buffer.from('x'),
        nome_arquivo: 'x.pdf',
      }),
    };
    createQueryBuilder.mockReturnValue(qb);

    await expect(
      service.replace(3, {
        nome_arquivo: 'n.pdf',
        arquivo: Buffer.from('n'),
        mime: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('homologates without motivo and stubs notification', async () => {
    findOneDoc.mockResolvedValue({
      id: 4,
      id_candidatura: 1,
      tipo_documento: 'CPF',
      status_documento: StatusDocumento.EM_ANALISE,
    });
    findOneCand.mockResolvedValue(stubCandidatura());
    saveDoc.mockImplementation(async (row: Documento) => row);

    const result = await service.decidir(4, {
      status: StatusDocumento.APROVADO,
      id_gestor: 1,
    });

    expect(result.status_documento).toBe(StatusDocumento.APROVADO);
    expect(result.notificacao_stub_id).toBe(77);
    expect(saveNotif).toHaveBeenCalled();
  });

  it('requires catalogue motivo to reject', async () => {
    findOneDoc.mockResolvedValue({
      id: 4,
      id_candidatura: 1,
      tipo_documento: 'CPF',
      status_documento: StatusDocumento.EM_ANALISE,
    });

    await expect(
      service.decidir(4, { status: StatusDocumento.REPROVADO }),
    ).rejects.toBeInstanceOf(BadRequestException);

    findOneMotivo.mockResolvedValue({
      id: 2,
      codigo: 'OUTRO',
      exige_texto_livre: true,
      ativo: true,
    });
    await expect(
      service.decidir(4, {
        status: StatusDocumento.REPROVADO,
        id_motivo: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    findOneMotivo.mockResolvedValue({
      id: 1,
      codigo: 'ILEGIVEL',
      exige_texto_livre: false,
      ativo: true,
    });
    findOneCand.mockResolvedValue(stubCandidatura());
    saveDoc.mockImplementation(async (row: Documento) => row);

    const rejected = await service.decidir(4, {
      status: StatusDocumento.REPROVADO,
      id_motivo: 1,
    });
    expect(rejected.status_documento).toBe(StatusDocumento.REPROVADO);
  });

  it('previewSugestaoIa does not change status (no auto-reject)', () => {
    const out = service.previewSugestaoIa(
      StatusDocumento.EM_ANALISE,
      'rejeitar automaticamente',
    );
    expect(out.status_documento).toBe(StatusDocumento.EM_ANALISE);
  });

  it('findOne throws when missing', async () => {
    findOneDoc.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listReutilizaveis enforces ownership and returns matches', async () => {
    findOneCand.mockResolvedValue(stubCandidatura({ id_usuario: 10 }));
    findTipo.mockResolvedValue([
      {
        id: 1,
        nome: 'RG',
        id_tipo_base: 4,
        fase: FaseDocumento.INSCRICAO,
        obrigatorio: true,
      },
      {
        id: 2,
        nome: 'Laudo',
        id_tipo_base: null,
        fase: FaseDocumento.INSCRICAO,
        obrigatorio: false,
      },
    ]);
    listForUser.mockResolvedValue({
      documentos: [
        {
          id: 55,
          id_tipo_base: 4,
          nome_arquivo: 'rg.pdf',
          mime: 'application/pdf',
          atualizado_em: new Date('2026-01-01'),
          tipo_nome: 'RG',
        },
      ],
    });

    await expect(service.listReutilizaveis(1, 99)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const result = await service.listReutilizaveis(1, 10);
    expect(result.exigencias).toHaveLength(2);
    expect(result.exigencias[0]?.match?.id_documento_conta).toBe(55);
    expect(result.exigencias[0]?.match?.match_by).toBe('id_tipo_base');
    expect(result.exigencias[1]?.match).toBeNull();
  });

  it('reutilizar copies BYTEA immutably and audits reuse_from_conta', async () => {
    const sourceBytes = Buffer.from('conta-pdf');
    findOneCand.mockResolvedValue(stubCandidatura({ id_usuario: 10 }));
    findOneTipo.mockResolvedValue({
      id: 1,
      nome: 'RG',
      id_tipo_base: 4,
      fase: FaseDocumento.INSCRICAO,
      id_edital: 5,
    });
    listForUser.mockResolvedValue({
      documentos: [
        {
          id: 55,
          id_tipo_base: 4,
          nome_arquivo: 'rg.pdf',
          mime: 'application/pdf',
          tipo_nome: 'RG',
        },
      ],
    });
    loadArquivoOwned.mockResolvedValue({
      id: 55,
      id_usuario: 10,
      id_tipo_base: 4,
      nome_arquivo: 'rg.pdf',
      mime: 'application/pdf',
      arquivo: sourceBytes,
      tipo_nome: 'RG',
    });
    findOneDoc.mockResolvedValue(null);
    saveDoc.mockImplementation(async (row: Documento) => ({ ...row, id: 88 }));

    const result = await service.reutilizar(
      { id_candidatura: 1, id_tipo_documento: 1 },
      10,
    );

    expect(result.id).toBe(88);
    expect(createDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_documento: 'RG',
        nome_arquivo: 'rg.pdf',
      }),
    );
    const createdArquivo = (createDoc.mock.calls[0]?.[0] as Documento).arquivo;
    expect(Buffer.isBuffer(createdArquivo)).toBe(true);
    expect(createdArquivo.equals(sourceBytes)).toBe(true);
    expect(createdArquivo).not.toBe(sourceBytes);
    expect(saveAudit).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'reuse_from_conta' }),
    );
  });

  it('mirrors to Meus Dados only when espelhar_meus_dados=true and id_tipo_base set', async () => {
    findOneCand.mockResolvedValue(stubCandidatura({ id_usuario: 10 }));
    findOneDoc.mockResolvedValue(null);
    saveDoc.mockImplementation(async (row: Documento) => ({ ...row, id: 9 }));
    findTipo.mockResolvedValue([
      {
        id: 1,
        nome: 'CPF',
        id_tipo_base: 7,
        fase: FaseDocumento.INSCRICAO,
      },
    ]);

    const noFlag = await service.create({
      id_candidatura: 1,
      tipo_documento: 'CPF',
      nome_arquivo: 'cpf.pdf',
      arquivo: Buffer.from('pdf-bytes'),
      mime: 'application/pdf',
      id_usuario: 10,
    });
    expect(noFlag.espelhado_meus_dados).toBe(false);
    expect(noFlag.espelhar_skip_motivo).toBe('flag_ausente');
    expect(upsertFromBuffer).not.toHaveBeenCalled();

    const mirrored = await service.create({
      id_candidatura: 1,
      tipo_documento: 'CPF',
      nome_arquivo: 'cpf.pdf',
      arquivo: Buffer.from('pdf-bytes'),
      mime: 'application/pdf',
      id_usuario: 10,
      espelhar_meus_dados: true,
    });
    expect(mirrored.espelhado_meus_dados).toBe(true);
    expect(upsertFromBuffer).toHaveBeenCalledWith(
      10,
      7,
      expect.objectContaining({ nome_arquivo: 'cpf.pdf' }),
    );
  });

  it('replace after reject does not auto-mirror unless flag set', async () => {
    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 3,
        id_candidatura: 1,
        tipo_documento: 'CPF',
        nome_arquivo: 'old.pdf',
        status_documento: StatusDocumento.REPROVADO,
        fase: FaseDocumento.INSCRICAO,
        candidatura: stubCandidatura({ id_usuario: 10 }),
        arquivo: Buffer.from('old'),
      }),
    };
    createQueryBuilder.mockReturnValue(qb);
    saveDoc.mockImplementation(async (row: Documento) => row);
    findTipo.mockResolvedValue([
      { id: 1, nome: 'CPF', id_tipo_base: 7, fase: FaseDocumento.INSCRICAO },
    ]);

    const result = await service.replace(3, {
      nome_arquivo: 'new.pdf',
      arquivo: Buffer.from('new'),
      mime: 'application/pdf',
      id_usuario: 10,
    });

    expect(result.status_documento).toBe(StatusDocumento.EM_ANALISE);
    expect(result.espelhado_meus_dados).toBe(false);
    expect(upsertFromBuffer).not.toHaveBeenCalled();
  });

  it('skips mirror when tipo has no id_tipo_base', async () => {
    findOneCand.mockResolvedValue(stubCandidatura({ id_usuario: 10 }));
    findOneDoc.mockResolvedValue(null);
    saveDoc.mockImplementation(async (row: Documento) => ({ ...row, id: 9 }));
    findTipo.mockResolvedValue([
      {
        id: 2,
        nome: 'Laudo',
        id_tipo_base: null,
        fase: FaseDocumento.INSCRICAO,
      },
    ]);

    const result = await service.create({
      id_candidatura: 1,
      tipo_documento: 'Laudo',
      nome_arquivo: 'l.pdf',
      arquivo: Buffer.from('x'),
      mime: 'application/pdf',
      id_usuario: 10,
      espelhar_meus_dados: true,
    });
    expect(result.espelhado_meus_dados).toBe(false);
    expect(result.espelhar_skip_motivo).toBe('sem_id_tipo_base');
    expect(upsertFromBuffer).not.toHaveBeenCalled();
  });
});
