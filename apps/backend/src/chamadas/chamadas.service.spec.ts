import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ListaClassificacao, StatusCandidatura } from '@repo/types';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { ChamadasService } from './chamadas.service';
import { Chamada } from './entities/chamada.entity';
import { ChamadaVaga } from './entities/chamada-vaga.entity';
import { ClassificacaoItem } from './entities/classificacao-item.entity';

type Saved = Record<string, unknown> & { id?: number };

describe('ChamadasService (W24 / REQ-3.1 a 3.5)', () => {
  let service: ChamadasService;
  let saved: { chamada?: Saved; vagas: Saved[]; itens: Saved[] };
  let updates: { ids: number[]; patch: Record<string, unknown> }[];

  const chamadaRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    manager: { transaction: jest.fn() },
    exists: jest.fn().mockResolvedValue(true),
  };
  const chamadaVagaRepository = {};
  const classificacaoItemRepository = { find: jest.fn(), count: jest.fn() };
  const ofertaRepository = { findOne: jest.fn() };
  const candidaturaRepository = { find: jest.fn(), update: jest.fn() };

  const entityManager = {
    create: (_entity: unknown, obj: Saved) => ({ ...obj }),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    saved = { vagas: [], itens: [] };
    updates = [];

    let proximoId = 1;
    entityManager.save.mockImplementation((payload: Saved | Saved[]) => {
      if (Array.isArray(payload)) {
        const comId = payload.map((item) => ({ ...item, id: proximoId++ }));
        if (comId[0] && 'lista' in comId[0]) saved.itens = comId;
        else saved.vagas = comId;
        return Promise.resolve(comId);
      }
      saved.chamada = { ...payload, id: proximoId++ };
      return Promise.resolve(saved.chamada);
    });
    entityManager.update.mockImplementation(
      (_entity: unknown, ids: number[], patch: Record<string, unknown>) => {
        updates.push({ ids, patch });
        return Promise.resolve({ affected: ids.length });
      },
    );
    chamadaRepository.manager.transaction.mockImplementation(
      (cb: (em: typeof entityManager) => Promise<unknown>) => cb(entityManager),
    );
    chamadaRepository.findOne.mockImplementation(() =>
      Promise.resolve({
        ...(saved.chamada ?? {}),
        vagas: saved.vagas,
        itens: saved.itens,
      }),
    );
    classificacaoItemRepository.find.mockResolvedValue([]);
    classificacaoItemRepository.count.mockResolvedValue(0);
    chamadaRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChamadasService,
        { provide: getRepositoryToken(Chamada), useValue: chamadaRepository },
        {
          provide: getRepositoryToken(ChamadaVaga),
          useValue: chamadaVagaRepository,
        },
        {
          provide: getRepositoryToken(ClassificacaoItem),
          useValue: classificacaoItemRepository,
        },
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepository },
        {
          provide: getRepositoryToken(Candidatura),
          useValue: candidaturaRepository,
        },
      ],
    }).compile();

    service = module.get(ChamadasService);
  });

  const ofertaComCotas = () => ({
    id: 10,
    vagas_totais: 4,
    distribuicao_cotas: [{ tipo_cota: 'PPI', vagas: 2, percentual: null }],
    edital: { fallback_ac_para_rv: false },
  });

  const candidaturas = () => [
    { id: 1, tipo_vaga: 'AC', status: StatusCandidatura.INSCRICAO_RECEBIDA },
    { id: 2, tipo_vaga: 'PPI', status: StatusCandidatura.INSCRICAO_RECEBIDA },
    { id: 3, tipo_vaga: 'AC', status: StatusCandidatura.INSCRICAO_RECEBIDA },
    { id: 4, tipo_vaga: 'PPI', status: StatusCandidatura.INSCRICAO_RECEBIDA },
    { id: 5, tipo_vaga: 'AC', status: StatusCandidatura.CANCELADA },
    { id: 6, tipo_vaga: 'AC', status: StatusCandidatura.INSCRICAO_RECEBIDA },
  ];

  it('gera a 1ª chamada a partir da distribuição da oferta', async () => {
    ofertaRepository.findOne.mockResolvedValue(ofertaComCotas());
    candidaturaRepository.find.mockResolvedValue(candidaturas());

    await service.gerar({ id_oferta: 10 });

    expect(saved.chamada).toMatchObject({
      numero: 1,
      fallback_ac_para_rv: false,
    });
    expect(saved.vagas).toEqual([
      expect.objectContaining({ tipo_cota: 'AC', vagas: 2, preenchidas: 2 }),
      expect.objectContaining({ tipo_cota: 'PPI', vagas: 2, preenchidas: 2 }),
    ]);
    expect(
      saved.itens.filter(
        (item) => item.lista === ListaClassificacao.CHAMADA_REGULAR,
      ),
    ).toHaveLength(4);
  });

  it('marca os convocados como pré-selecionados (REQ-3.4)', async () => {
    ofertaRepository.findOne.mockResolvedValue(ofertaComCotas());
    candidaturaRepository.find.mockResolvedValue(candidaturas());

    await service.gerar({ id_oferta: 10 });

    expect(updates).toHaveLength(1);
    expect(updates[0].patch).toEqual({
      status: StatusCandidatura.PRE_SELECIONADO,
    });
    // A candidatura cancelada não é convocada.
    expect(updates[0].ids).not.toContain(5);
  });

  it('leva as vagas de cota não preenchidas para a AC da chamada seguinte (REQ-3.1)', async () => {
    ofertaRepository.findOne.mockResolvedValue(ofertaComCotas());
    chamadaRepository.find.mockResolvedValue([
      {
        id: 1,
        numero: 1,
        vagas: [
          { tipo_cota: 'AC', vagas: 2, preenchidas: 2 },
          { tipo_cota: 'PPI', vagas: 2, preenchidas: 0 },
        ],
      },
    ]);
    classificacaoItemRepository.find.mockResolvedValue([
      { id: 1, id_candidatura: 1 },
      { id: 2, id_candidatura: 3 },
    ]);
    candidaturaRepository.find.mockResolvedValue(candidaturas());

    await service.gerar({ id_oferta: 10 });

    expect(saved.chamada).toMatchObject({ numero: 2 });
    expect(saved.vagas).toEqual([
      expect.objectContaining({ tipo_cota: 'AC', vagas: 2, preenchidas: 2 }),
    ]);
    expect(updates[0].ids).toEqual([2, 4]);
  });

  it('recusa gerar chamada sem vagas remanescentes', async () => {
    ofertaRepository.findOne.mockResolvedValue(ofertaComCotas());
    chamadaRepository.find.mockResolvedValue([
      {
        id: 1,
        numero: 1,
        vagas: [{ tipo_cota: 'AC', vagas: 4, preenchidas: 4 }],
      },
    ]);
    candidaturaRepository.find.mockResolvedValue(candidaturas());

    await expect(service.gerar({ id_oferta: 10 })).rejects.toThrow(
      /remanescentes/i,
    );
  });

  it('importa matriculados por CPF e reporta os não encontrados (REQ-3.5)', async () => {
    chamadaRepository.findOne.mockResolvedValue({ id: 1, id_oferta: 10 });
    candidaturaRepository.find.mockResolvedValue([
      { id: 1, usuario: { CPF: '529.982.247-25' } },
      { id: 2, usuario: { CPF: '11144477735' } },
    ]);

    const resultado = await service.importarMatriculadosPorChamada(1, [
      '52998224725',
      '98765432100',
    ]);

    expect(resultado).toEqual({
      matriculados: 1,
      nao_encontrados: ['98765432100'],
    });
    expect(candidaturaRepository.update).toHaveBeenCalledWith([1], {
      status: StatusCandidatura.MATRICULADO,
    });
  });
});
