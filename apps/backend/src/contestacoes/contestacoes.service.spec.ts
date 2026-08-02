import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  EtapaStatusOverride,
  StatusCandidatura,
  StatusContestacao,
  TipoContestacao,
} from '@repo/types';
import { ContestacoesService } from './contestacoes.service';
import { ContestacoesController } from './contestacoes.controller';
import { Contestacao } from './entities/contestacao.entity';
import { ContestacaoHistorico } from './entities/contestacao-historico.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import { TemplateEdital } from '../templates/entities/template-edital.entity';
import { TemplateBiblioteca } from '../templates/entities/template-biblioteca.entity';
import { Gestor } from '../gestores/entities/gestor.entity';
import { Notificacao } from '../notificacoes/entities/notificacao.entity';
import { NotificacaoLeitura } from '../notificacoes/entities/notificacao-leitura.entity';
import { ERR_ETAPA_CONTESTACAO_FECHADA } from './contestacoes-eligibility.util';

describe('ContestacoesService', () => {
  let service: ContestacoesService;

  const saveContest = jest.fn(async (row: Contestacao) => ({
    ...row,
    id: row.id ?? 11,
    criado_em: new Date(),
    atualizado_em: new Date(),
  }));
  const createContest = jest.fn((row: unknown) => row);
  const findContest = jest.fn();
  const findOneContest = jest.fn();
  const createQueryBuilder = jest.fn();

  const saveHist = jest.fn(async (row: ContestacaoHistorico) => ({
    ...row,
    id: Math.floor(Math.random() * 1000) + 1,
    enviado_em: new Date(),
  }));
  const createHist = jest.fn((row: unknown) => row);

  const findOneCand = jest.fn();
  const findAllGestao = jest.fn();
  const findTplEdital = jest.fn();
  const findOneTplEdital = jest.fn();
  const findTplBib = jest.fn();
  const findOneGestor = jest.fn();
  const qbGestor = jest.fn();
  const saveNotif = jest.fn(async (row: unknown) => ({
    ...(row as object),
    id: 77,
  }));
  const createNotif = jest.fn((row: unknown) => row);
  const saveLeitura = jest.fn(async (row: unknown) => row);
  const createLeitura = jest.fn((row: unknown) => row);

  const openEtapas = {
    etapas: [
      {
        id: 1,
        elegivel_impugnacao: true,
        elegivel_recurso: true,
        override: EtapaStatusOverride.AUTOMATICO,
        data_inicio: new Date(Date.now() - 86400000),
        data_fim: new Date(Date.now() + 86400000),
        template_instrucao_id: null,
      },
    ],
    warnings: [],
    janela_inscricao: { aberta: true, etapa: null },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    findAllGestao.mockResolvedValue(openEtapas);
    findTplEdital.mockResolvedValue([]);
    findTplBib.mockResolvedValue([]);
    findOneGestor.mockResolvedValue({ id: 5 });
    qbGestor.mockReturnValue({
      where: () => ({ getOne: async () => ({ id: 5 }) }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContestacoesService,
        {
          provide: getRepositoryToken(Contestacao),
          useValue: {
            save: saveContest,
            create: createContest,
            find: findContest,
            findOne: findOneContest,
            createQueryBuilder,
          },
        },
        {
          provide: getRepositoryToken(ContestacaoHistorico),
          useValue: { save: saveHist, create: createHist },
        },
        {
          provide: getRepositoryToken(Candidatura),
          useValue: { findOne: findOneCand },
        },
        {
          provide: getRepositoryToken(TemplateEdital),
          useValue: { find: findTplEdital, findOne: findOneTplEdital },
        },
        {
          provide: getRepositoryToken(TemplateBiblioteca),
          useValue: { find: findTplBib },
        },
        {
          provide: getRepositoryToken(Gestor),
          useValue: {
            findOne: findOneGestor,
            createQueryBuilder: qbGestor,
          },
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
          provide: CronogramaService,
          useValue: { findAllGestao },
        },
      ],
    }).compile();

    service = module.get(ContestacoesService);
  });

  it('public impugnacao creates enviada when window open', async () => {
    const row = await service.createImpugnacao({
      id_edital: 1,
      texto: 'Fundamento da impugnação',
      nome_requerente: 'Ana',
      email_requerente: 'ana@example.com',
    });
    expect(row.status).toBe(StatusContestacao.ENVIADA);
    expect(row.tipo).toBe(TipoContestacao.IMPUGNACAO);
    expect(saveContest).toHaveBeenCalled();
  });

  it('closed / blocked window → ETAPA_CONTESTACAO_FECHADA', async () => {
    findAllGestao.mockResolvedValue({
      ...openEtapas,
      etapas: [
        {
          ...openEtapas.etapas[0],
          override: EtapaStatusOverride.BLOQUEADO_MANUALMENTE,
        },
      ],
    });
    try {
      await service.createImpugnacao({
        id_edital: 1,
        texto: 'x'.repeat(10),
        nome_requerente: 'A',
        email_requerente: 'a@b.com',
      });
      fail('expected ForbiddenException');
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((e as ForbiddenException).getResponse()).toMatchObject({
        code: ERR_ETAPA_CONTESTACAO_FECHADA,
      });
    }
  });

  it('recurso with foreign candidatura → 403', async () => {
    findOneCand.mockResolvedValue({
      id: 9,
      id_usuario: 99,
      id_edital: 1,
      status: StatusCandidatura.EM_ANALISE,
    });
    await expect(
      service.createCandidato({
        id_usuario: 1,
        tipo: TipoContestacao.RECURSO,
        id_candidatura: 9,
        texto: 'Meu recurso',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cancelled candidatura → reject', async () => {
    findOneCand.mockResolvedValue({
      id: 9,
      id_usuario: 1,
      id_edital: 1,
      status: StatusCandidatura.CANCELADA,
    });
    await expect(
      service.createCandidato({
        id_usuario: 1,
        tipo: TipoContestacao.RECURSO,
        id_candidatura: 9,
        texto: 'Meu recurso',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recurso OK with owned candidatura + anexo', async () => {
    findOneCand.mockResolvedValue({
      id: 9,
      id_usuario: 1,
      id_edital: 1,
      status: StatusCandidatura.EM_ANALISE,
    });
    const row = await service.createCandidato({
      id_usuario: 1,
      tipo: TipoContestacao.RECURSO,
      id_candidatura: 9,
      texto: 'Meu recurso fundamentado',
      anexo: {
        buffer: Buffer.from('%PDF'),
        originalname: 'a.pdf',
        mimetype: 'application/pdf',
      },
    });
    expect(row.tipo).toBe(TipoContestacao.RECURSO);
    expect(row.nome_anexo).toBe('a.pdf');
  });

  it('status transition enviada→em_analise→deferida', async () => {
    findOneContest
      .mockResolvedValueOnce({
        id: 3,
        status: StatusContestacao.ENVIADA,
      })
      .mockResolvedValueOnce({
        id: 3,
        status: StatusContestacao.EM_ANALISE,
      });
    await service.patchStatus(3, StatusContestacao.EM_ANALISE);
    await service.patchStatus(3, StatusContestacao.DEFERIDA);
    expect(saveContest).toHaveBeenCalledTimes(2);
  });

  it('responder writes historico per canal + stub notify', async () => {
    findOneContest
      .mockResolvedValueOnce({
        id: 3,
        status: StatusContestacao.ENVIADA,
        id_usuario: 10,
        id_edital: 1,
        tipo: TipoContestacao.RECURSO,
      })
      .mockResolvedValueOnce({
        id: 3,
        status: StatusContestacao.EM_ANALISE,
        id_usuario: 10,
        id_edital: 1,
        historico: [],
      });
    const res = await service.responder(3, {
      id_usuario_gestor: 2,
      corpo: 'Resposta do gestor',
      canais: ['email', 'pwa'],
    });
    expect(saveHist).toHaveBeenCalledTimes(2);
    expect(saveNotif).toHaveBeenCalled();
    expect(res.historico_criado).toHaveLength(2);
    // id_contestacao must be set (insertable FK)
    expect(createHist).toHaveBeenCalledWith(
      expect.objectContaining({ id_contestacao: 3, canal: 'email' }),
    );
  });

  it('no mass reply — responder requires single id (NotFound on missing)', async () => {
    findOneContest.mockResolvedValue(null);
    await expect(
      service.responder(999, {
        id_usuario_gestor: 1,
        corpo: 'x',
        canais: ['pwa'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ContestacoesController route surface', () => {
  it('does not expose responder-lote', () => {
    const proto = ContestacoesController.prototype;
    expect(
      Object.getOwnPropertyNames(proto).some((n) =>
        n.toLowerCase().includes('lote'),
      ),
    ).toBe(false);
    // Path string must not appear in controller source surface
    expect(String(ContestacoesController)).not.toMatch(/responder-lote/);
  });
});
