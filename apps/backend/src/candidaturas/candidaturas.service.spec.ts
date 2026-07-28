import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusCandidatura, TipoVagaCandidatura } from '@repo/types';
import { CandidaturasService } from './candidaturas.service';
import { Candidatura } from './entities/candidatura.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import { SocioeconomicoService } from '../socioeconomico/socioeconomico.service';
import {
  MSG_ACTIVE_DUPLICATE,
  MSG_BLOCKED_AFTER_TERMINAL,
  MSG_CANCEL_WINDOW_CLOSED,
  MSG_INSCRICAO_WINDOW_CLOSED,
} from './candidatura-uniqueness.util';

describe('CandidaturasService', () => {
  let service: CandidaturasService;

  const candidaturaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(),
  };

  const ofertaRepo = {
    findOne: jest.fn(),
  };

  const cronogramaService = {
    getJanelaInscricao: jest.fn(),
  };

  const socioeconomicoService = {
    applyForCandidatura: jest.fn().mockResolvedValue(null),
    findByCandidatura: jest.fn().mockResolvedValue({
      ativo: null,
      arquivados: [],
      socioeconomico_incompleto: false,
      regra_b_socioeconomico: true,
    }),
  };

  const oferta = {
    id: 5,
    id_edital: 10,
    id_curso: 1,
    id_campus: 1,
  } as Oferta;

  beforeEach(async () => {
    jest.clearAllMocks();
    socioeconomicoService.applyForCandidatura.mockResolvedValue(null);
    socioeconomicoService.findByCandidatura.mockResolvedValue({
      ativo: null,
      arquivados: [],
      socioeconomico_incompleto: false,
      regra_b_socioeconomico: true,
    });
    cronogramaService.getJanelaInscricao.mockResolvedValue({
      aberta: true,
      etapa: { tipo: 'INSCRICAO' },
    });
    ofertaRepo.findOne.mockResolvedValue(oferta);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidaturasService,
        {
          provide: getRepositoryToken(Candidatura),
          useValue: candidaturaRepo,
        },
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepo },
        { provide: CronogramaService, useValue: cronogramaService },
        { provide: SocioeconomicoService, useValue: socioeconomicoService },
      ],
    }).compile();

    service = module.get(CandidaturasService);
  });

  describe('create — socioeconómico (REQ-2.3)', () => {
    it('applies socio payload for BAIXA_RENDA', async () => {
      candidaturaRepo.find.mockResolvedValue([]);
      candidaturaRepo.save.mockImplementation(async (row) => ({
        id: 50,
        ...row,
      }));

      await service.create({
        id_usuario: 1,
        id_oferta: 5,
        id_edital: 10,
        tipo_vaga: TipoVagaCandidatura.BAIXA_RENDA,
        socioeconomico: { id_faixa: 1, numero_pessoas: 3 },
      });

      expect(socioeconomicoService.applyForCandidatura).toHaveBeenCalledWith(
        expect.objectContaining({ id: 50 }),
        TipoVagaCandidatura.BAIXA_RENDA,
        { id_faixa: 1, numero_pessoas: 3 },
      );
    });
  });

  describe('create — uniqueness CPF×edital (REQ-2.2)', () => {
    it('creates when no prior inscription on edital', async () => {
      candidaturaRepo.find.mockResolvedValue([]);
      candidaturaRepo.save.mockImplementation(async (row) => ({
        id: 99,
        ...row,
        id_usuario: 1,
        id_oferta: 5,
        id_edital: 10,
        status: StatusCandidatura.INSCRICAO_RECEBIDA,
      }));

      const result = await service.create({
        id_usuario: 1,
        id_oferta: 5,
        id_edital: 10,
        tipo_vaga: TipoVagaCandidatura.AC,
      });

      expect(result.id).toBe(99);
      expect(cronogramaService.getJanelaInscricao).toHaveBeenCalledWith(10);
      expect(candidaturaRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_usuario: 1, id_edital: 10 },
        }),
      );
    });

    it('allows create after cancelada', async () => {
      candidaturaRepo.find.mockResolvedValue([
        {
          id: 1,
          id_usuario: 1,
          id_edital: 10,
          status: StatusCandidatura.CANCELADA,
        },
      ]);
      candidaturaRepo.save.mockImplementation(async (row) => ({
        id: 2,
        ...row,
      }));

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).resolves.toMatchObject({ id: 2 });
    });

    it('rejects second active inscription on same edital', async () => {
      candidaturaRepo.find.mockResolvedValue([
        {
          id: 1,
          id_usuario: 1,
          id_edital: 10,
          status: StatusCandidatura.INSCRICAO_RECEBIDA,
        },
      ]);

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).rejects.toThrow(MSG_ACTIVE_DUPLICATE);
    });

    it('blocks create after reprovado', async () => {
      candidaturaRepo.find.mockResolvedValue([
        {
          id: 1,
          id_usuario: 1,
          id_edital: 10,
          status: StatusCandidatura.REPROVADO,
        },
      ]);

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).rejects.toThrow(MSG_BLOCKED_AFTER_TERMINAL);
    });

    it('blocks create after desclassificada', async () => {
      candidaturaRepo.find.mockResolvedValue([
        {
          id: 1,
          id_usuario: 1,
          id_edital: 10,
          status: StatusCandidatura.DESCLASSIFICADA,
        },
      ]);

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).rejects.toThrow(MSG_BLOCKED_AFTER_TERMINAL);
    });

    it('rejects create outside Inscrição window', async () => {
      cronogramaService.getJanelaInscricao.mockResolvedValue({
        aberta: false,
        etapa: null,
      });
      candidaturaRepo.find.mockResolvedValue([]);

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 10,
        }),
      ).rejects.toThrow(MSG_INSCRICAO_WINDOW_CLOSED);
      expect(candidaturaRepo.save).not.toHaveBeenCalled();
    });

    it('rejects unknown oferta', async () => {
      ofertaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 999,
          id_edital: 10,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects id_edital mismatch vs oferta', async () => {
      await expect(
        service.create({
          id_usuario: 1,
          id_oferta: 5,
          id_edital: 999,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancel — Inscrição window (REQ-2.2)', () => {
    const active: Candidatura = {
      id: 7,
      id_usuario: 1,
      id_oferta: 5,
      id_edital: 10,
      data_inscricao: '2026-01-01',
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      tipo_vaga: TipoVagaCandidatura.AC,
    };

    it('sets status to cancelada when window open', async () => {
      candidaturaRepo.findOne.mockResolvedValue({ ...active });
      candidaturaRepo.save.mockImplementation(async (row) => row);

      const result = await service.cancel(7);

      expect(result.status).toBe(StatusCandidatura.CANCELADA);
      expect(cronogramaService.getJanelaInscricao).toHaveBeenCalledWith(10);
    });

    it('rejects cancel outside Inscrição window', async () => {
      candidaturaRepo.findOne.mockResolvedValue({ ...active });
      cronogramaService.getJanelaInscricao.mockResolvedValue({
        aberta: false,
        etapa: { tipo: 'INSCRICAO' },
      });

      await expect(service.cancel(7)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.cancel(7)).rejects.toThrow(MSG_CANCEL_WINDOW_CLOSED);
      expect(candidaturaRepo.save).not.toHaveBeenCalled();
    });

    it('rejects cancel of already cancelada', async () => {
      candidaturaRepo.findOne.mockResolvedValue({
        ...active,
        status: StatusCandidatura.CANCELADA,
      });

      await expect(service.cancel(7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects cancel of reprovado', async () => {
      candidaturaRepo.findOne.mockResolvedValue({
        ...active,
        status: StatusCandidatura.REPROVADO,
      });

      await expect(service.cancel(7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
