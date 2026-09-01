import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AssistantOperacao,
  StatusCandidatura,
  TermosModo,
  MetodoSelecao,
} from '@repo/types';
import { AssistantService } from './assistant.service';
import { AssistantInteracao } from './entities/assistant-interacao.entity';
import { AssistantIngestao } from './entities/assistant-ingestao.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { User } from '../user/entities/user.entity';
import { HubService } from '../hub/hub.service';

const N8N_VARS = ['N8N_BASE_URL', 'N8N_CHAT_URL', 'N8N_USER', 'N8N_PASSWORD'];

function makeOkResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AssistantService', () => {
  let service: AssistantService;

  const interacaoRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 7, ...(x ?? {}) })),
    update: jest.fn(),
    find: jest.fn(),
  };

  const ingestaoRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, ...x })),
    find: jest.fn(),
  };

  const editalRepo = {
    findOne: jest.fn(),
  };

  const candidaturaRepo = {
    find: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  const jwtService = {
    verify: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  const hubService = {
    getPublic: jest.fn(),
  };

  const fullEdital = {
    id: 10,
    numero_ano: '001/2026',
    metodo_selecao: MetodoSelecao.ALEATORIO,
    merito_tipo: null,
    is_simplificado: false,
    fallback_ac_para_rv: false,
    termos_modo: TermosModo.URL,
    termos_valor: 'https://example.com/termos.pdf',
    link_oficial: 'https://example.com/edital.pdf',
    publicado: true,
    inscricoes_abertas: true,
  };

  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: getRepositoryToken(AssistantInteracao), useValue: interacaoRepo },
        { provide: getRepositoryToken(AssistantIngestao), useValue: ingestaoRepo },
        { provide: getRepositoryToken(Edital), useValue: editalRepo },
        { provide: getRepositoryToken(Candidatura), useValue: candidaturaRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: HubService, useValue: hubService },
      ],
    }).compile();

    service = module.get(AssistantService);
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function mockN8nConfig() {
    const url = 'http://n8n.local';
    configService.get.mockImplementation((key: string) => {
      const map: Record<string, string | null> = {
        N8N_BASE_URL: url,
        N8N_CHAT_URL: '/webhook/chat',
        N8N_USER: 'n8n-user',
        N8N_PASSWORD: 'n8n-pass',
        N8N_INGEST_URL: '/webhook/ingest',
      };
      return map[key] ?? null;
    });
    return url;
  }

  describe('chat', () => {
    it('#1 anonymous: calls n8n, precisaLogin true, audit row without user', async () => {
      mockN8nConfig();
      fetchSpy.mockResolvedValue(
        makeOkResponse({
          output: 'resposta',
          sources: [],
          sentiment: 'positivo',
        }),
      );

      const res = await service.chat(
        { chatInput: 'oi', sessionId: 's1' },
        null,
      );

      expect(res).toEqual({
        resposta: 'resposta',
        messageId: 7,
        sessionId: 's1',
        precisaLogin: true,
        sources: [],
        sentiment: 'positivo',
        audio: null,
      });
      expect(interacaoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 's1',
          id_usuario: null,
          chat_input: 'oi',
          audio_flag: false,
          resposta_agente: 'resposta',
        }),
      );
    });

    it('#2 authenticated: sends email/cidade/candidaturasAtivas and sets precisaLogin false', async () => {
      mockN8nConfig();
      jwtService.verify.mockReturnValue({ sub: 42, email: 'a@b.c' });
      userRepo.findOne.mockResolvedValue({
        id: 42,
        email: 'a@b.c',
        enderecos: [{ cidade: 'Brasília' }],
      });
      candidaturaRepo.find.mockResolvedValue([
        {
          id: 1,
          status: StatusCandidatura.PRE_SELECIONADO,
          oferta: { edital: { numero_ano: '2026/1' } },
        },
        {
          id: 2,
          status: StatusCandidatura.CANCELADA,
          oferta: { edital: { numero_ano: '2026/2' } },
        },
      ]);
      fetchSpy.mockResolvedValue(
        makeOkResponse({ output: 'ok', sources: null, sentiment: null }),
      );

      const res = await service.chat(
        { chatInput: 'oi', sessionId: 's2' },
        'Bearer tok',
      );

      expect(jwtService.verify).toHaveBeenCalledWith('tok');
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 42 },
        relations: { enderecos: true },
      });
      expect(candidaturaRepo.find).toHaveBeenCalledWith({
        where: { id_usuario: 42 },
        relations: { oferta: { edital: true } },
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual(
        expect.objectContaining({
          email: 'a@b.c',
          cidade: 'Brasília',
          candidaturasAtivas: ['2026/1'],
        }),
      );

      expect(res.precisaLogin).toBe(false);
      expect(interacaoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id_usuario: 42 }),
      );
    });

    it('#3 rejects audio over 25MB', async () => {
      const oversized = Buffer.alloc(26_214_401, 0).toString('base64');
      await expect(
        service.chat({ chatInput: 'x', audio: oversized }, null),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.chat({ chatInput: 'x', audio: oversized }, null),
      ).rejects.toThrow(/25MB/);
    });

    it('#4 rejects invalid base64 audio', async () => {
      await expect(
        service.chat({ chatInput: 'x', audio: '!!!not-base64!!!' }, null),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('#5 falls back to FAQ when n8n is not configured', async () => {
      configService.get.mockReturnValue(null);
      hubService.getPublic.mockResolvedValue({
        faqs: [
          {
            id: 1,
            pergunta: 'Como me inscrever?',
            resposta: 'Resposta FAQ',
            ordem: 0,
            ativo: true,
          },
        ],
      });

      const res = await service.chat({
        chatInput: 'Quero saber: Como me inscrever? hoje mesmo',
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(res.resposta).toBe('Resposta FAQ');
      expect(interacaoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ resposta_agente: 'Resposta FAQ' }),
      );
    });

    it('#6 falls back to generic message when fetch rejects', async () => {
      mockN8nConfig();
      fetchSpy.mockRejectedValue(new Error('network down'));

      const res = await service.chat({ chatInput: 'oi', sessionId: 's6' });

      expect(res.resposta).toBe(
        'Ainda não tenho essa informação. Fale com a central de atendimento ou consulte o edital oficial.',
      );
      expect(interacaoRepo.save).toHaveBeenCalled();
    });
  });

  describe('feedback', () => {
    it('#7 updates thumbs up/down', async () => {
      interacaoRepo.update.mockResolvedValue({ affected: 1 });

      const res = await service.feedback({ messageId: '7', thumbs: 'down' });

      expect(interacaoRepo.update).toHaveBeenCalledWith(
        { id: 7 },
        { thumbs: 'down' },
      );
      expect(res).toEqual({ ok: true });
    });

    it('#8 throws NotFoundException when interaction missing', async () => {
      interacaoRepo.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.feedback({ messageId: '999', thumbs: 'up' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('enqueueIngestao', () => {
    it('#9 saves pendente insert row', async () => {
      await service.enqueueIngestao(5, 'insert' satisfies AssistantOperacao);

      expect(ingestaoRepo.create).toHaveBeenCalledWith({
        id_edital: 5,
        operacao: 'insert',
        status: 'pendente',
      });
      expect(ingestaoRepo.save).toHaveBeenCalledWith({
        id_edital: 5,
        operacao: 'insert',
        status: 'pendente',
      });
    });
  });

  describe('flushIngestoes', () => {
    it('#10 sends full payload for insert and marks enviado', async () => {
      mockN8nConfig();
      ingestaoRepo.find.mockResolvedValue([
        { id: 1, id_edital: 10, operacao: 'insert', status: 'pendente' },
      ]);
      editalRepo.findOne.mockResolvedValue(fullEdital);
      fetchSpy.mockResolvedValue(makeOkResponse({ ok: true }));

      const result = await service.flushIngestoes();

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://n8n.local/webhook/ingest',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual([
        {
          id: 10,
          numero_ano: '001/2026',
          metodo_selecao: MetodoSelecao.ALEATORIO,
          termos_modo: TermosModo.URL,
          termos_valor: 'https://example.com/termos.pdf',
          link_oficial: 'https://example.com/edital.pdf',
          publicado: true,
          inscricoes_abertas: true,
        },
      ]);
      expect(ingestaoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          id_edital: 10,
          operacao: 'insert',
          status: 'enviado',
          erro: null,
        }),
      );
      const savedItem = (ingestaoRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedItem.enviado_em).toBeInstanceOf(Date);
      expect(result).toEqual({ enviados: 1, erros: 0, detalhes: [
        expect.objectContaining({ id: 1, id_edital: 10, operacao: 'insert', status: 'enviado' }),
      ] });
    });

    it('#11 delete sends only id', async () => {
      mockN8nConfig();
      ingestaoRepo.find.mockResolvedValue([
        { id: 2, id_edital: 10, operacao: 'delete', status: 'pendente' },
      ]);
      editalRepo.findOne.mockResolvedValue(fullEdital);
      fetchSpy.mockResolvedValue(makeOkResponse({ ok: true }));

      await service.flushIngestoes();

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual([{ id: 10 }]);
    });

    it('#12 no n8n config marks all items erro', async () => {
      configService.get.mockReturnValue(null);
      ingestaoRepo.find.mockResolvedValue([
        { id: 3, id_edital: 10, operacao: 'insert', status: 'pendente' },
      ]);

      const result = await service.flushIngestoes();

      expect(ingestaoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 3,
          status: 'erro',
          erro: 'N8N_INGEST_URL não configurado',
        }),
      );
      expect(result).toEqual({ enviados: 0, erros: 1, detalhes: [
        expect.objectContaining({ id: 3, status: 'erro', erro: 'N8N_INGEST_URL não configurado' }),
      ] });
    });

    it('#13 edital missing marks item erro', async () => {
      mockN8nConfig();
      ingestaoRepo.find.mockResolvedValue([
        { id: 4, id_edital: 999, operacao: 'update', status: 'pendente' },
      ]);
      editalRepo.findOne.mockResolvedValue(null);
      fetchSpy.mockResolvedValue(makeOkResponse({ ok: true }));

      const result = await service.flushIngestoes();

      expect(ingestaoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 4, status: 'erro', erro: 'Edital não encontrado' }),
      );
      expect(result).toEqual({ enviados: 0, erros: 1, detalhes: [
        expect.objectContaining({ id: 4, status: 'erro', erro: 'Edital não encontrado' }),
      ] });
    });

    it('#14 empty queue returns zeros without fetching', async () => {
      ingestaoRepo.find.mockResolvedValue([]);

      const result = await service.flushIngestoes();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ enviados: 0, erros: 0, detalhes: [] });
    });
  });

  describe('listAuditoria / listIngestoes', () => {
    it('#15 lists interacoes ordered DESC take 200', async () => {
      interacaoRepo.find.mockResolvedValue([]);
      await service.listAuditoria();
      expect(interacaoRepo.find).toHaveBeenCalledWith({
        order: { id: 'DESC' },
        take: 200,
      });
    });

    it('#15b lists ingestoes ordered DESC take 200', async () => {
      ingestaoRepo.find.mockResolvedValue([]);
      await service.listIngestoes();
      expect(ingestaoRepo.find).toHaveBeenCalledWith({
        order: { id: 'DESC' },
        take: 200,
      });
    });
  });
});