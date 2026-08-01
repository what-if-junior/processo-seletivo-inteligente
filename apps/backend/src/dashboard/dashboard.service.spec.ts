import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusCandidatura } from '@repo/types';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { DASHBOARD_CSV_COLUMNS, DashboardService, toCsv } from './dashboard.service';

const OFERTAS = [
  {
    id: 1,
    id_edital: 1,
    id_campus: 1,
    turno: 'MATUTINO',
    vagas_totais: 4,
    edital: { id: 1, numero_ano: '01/2025' },
    campus: { id: 1, nome: 'Campus A' },
    curso: { id: 1, nome: 'Curso A' },
  },
  {
    id: 2,
    id_edital: 1,
    id_campus: 2,
    turno: 'NOTURNO',
    vagas_totais: 2,
    edital: { id: 1, numero_ano: '01/2025' },
    campus: { id: 2, nome: 'Campus B' },
    curso: { id: 2, nome: 'Curso B' },
  },
  {
    id: 3,
    id_edital: 2,
    id_campus: 1,
    turno: 'MATUTINO',
    vagas_totais: 3,
    edital: { id: 2, numero_ano: '02/2024' },
    campus: { id: 1, nome: 'Campus A' },
    curso: { id: 3, nome: 'Curso C' },
  },
];

const CANDIDATURAS = [
  { id: 1, id_oferta: 1, tipo_vaga: 'AC', status: StatusCandidatura.MATRICULADO },
  { id: 2, id_oferta: 1, tipo_vaga: 'PPI', status: StatusCandidatura.PRE_SELECIONADO },
  { id: 3, id_oferta: 1, tipo_vaga: 'AC', status: StatusCandidatura.INSCRICAO_RECEBIDA },
  { id: 4, id_oferta: 1, tipo_vaga: 'AC', status: StatusCandidatura.CANCELADA },
  { id: 5, id_oferta: 2, tipo_vaga: 'AC', status: StatusCandidatura.APROVADO },
  { id: 6, id_oferta: 2, tipo_vaga: 'PPI', status: StatusCandidatura.INSCRICAO_RECEBIDA },
  { id: 7, id_oferta: 3, tipo_vaga: 'PPI', status: StatusCandidatura.MATRICULADO },
];

describe('DashboardService (W25 / REQ-6.3)', () => {
  let service: DashboardService;

  const ofertaRepository = {
    find: jest.fn().mockImplementation(() => Promise.resolve(OFERTAS)),
  };
  const candidaturaRepository = {
    find: jest.fn().mockImplementation((options: any) => {
      const ids = options?.where?.id_oferta?.value ?? [];
      return Promise.resolve(
        CANDIDATURAS.filter((c) => ids.includes(c.id_oferta)),
      );
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Oferta), useValue: ofertaRepository },
        {
          provide: getRepositoryToken(Candidatura),
          useValue: candidaturaRepository,
        },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('agrega os cards ignorando as inscrições canceladas', async () => {
    const insights = await service.getInsights({});

    expect(insights.cards).toEqual({
      ofertas: 3,
      vagas: 9,
      inscritos: 6,
      // PRE_SELECIONADO + APROVADO only (excludes MATRICULADO)
      convocados: 2,
      matriculados: 2,
      vagas_ociosas: 7,
      taxa_ocupacao: 22.2,
      // matriculados / (convocados + matriculados)
      taxa_conversao: 50,
    });
  });

  it('quebra por campus e por AC vs cotas', async () => {
    const insights = await service.getInsights({});

    expect(insights.byCampus).toEqual([
      {
        id_campus: 1,
        campus: 'Campus A',
        vagas: 7,
        inscritos: 4,
        convocados: 1,
        matriculados: 2,
      },
      {
        id_campus: 2,
        campus: 'Campus B',
        vagas: 2,
        inscritos: 2,
        convocados: 1,
        matriculados: 0,
      },
    ]);

    expect(insights.acVsCotas).toEqual({
      ac: { inscritos: 3, convocados: 1, matriculados: 1 },
      cotas: { inscritos: 3, convocados: 1, matriculados: 1 },
    });
  });

  it('alerta quando há convocados sem matrícula', async () => {
    const insights = await service.getInsights({});

    const criticos = insights.alerts.filter((a) => a.nivel === 'critico');
    expect(criticos.map((a) => a.id_oferta)).toEqual([2]);
    expect(insights.alerts.some((a) => /sem matrícula/.test(a.mensagem))).toBe(
      true,
    );
  });

  it('muda as agregações conforme os filtros', async () => {
    const porAno = await service.getInsights({ ano: '2024' });
    expect(porAno.cards).toMatchObject({
      ofertas: 1,
      vagas: 3,
      inscritos: 1,
      matriculados: 1,
    });
    expect(porAno.table.map((l) => l.id_oferta)).toEqual([3]);

    const porCampus = await service.getInsights({ id_campus: 2 });
    expect(porCampus.cards).toMatchObject({ ofertas: 1, inscritos: 2 });
    expect(porCampus.byCampus.map((l) => l.campus)).toEqual(['Campus B']);

    const porTurno = await service.getInsights({ turno: 'NOTURNO' });
    expect(porTurno.table.map((l) => l.id_oferta)).toEqual([2]);

    const porEdital = await service.getInsights({ id_edital: 1 });
    expect(porEdital.table.map((l) => l.id_oferta)).toEqual([1, 2]);
    expect(porEdital.cards.vagas).toBe(6);
  });

  it('exporta o CSV com as colunas do painel', async () => {
    const csv = await service.exportCsv({ id_edital: 2 });
    const linhas = csv.split('\n');

    expect(linhas[0]).toBe(DASHBOARD_CSV_COLUMNS.join(';'));
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toBe('3;02/2024;Campus A;Curso C;MATUTINO;3;1;0;1;2');
  });

  it('escapa separadores e aspas no CSV', () => {
    const csv = toCsv([{ curso: 'Curso "A"; noturno' }], ['curso']);
    expect(csv).toBe('curso\n"Curso ""A""; noturno"');
  });
});
