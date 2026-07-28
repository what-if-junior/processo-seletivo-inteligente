import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StatusCandidatura } from '@repo/types';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { COTA_AC } from '../classificacao/remanescentes.util';

/**
 * W25 — painel de acompanhamento do ciclo (REQ-6.3).
 *
 * Tudo é agregado em memória a partir das ofertas filtradas: o volume por
 * edital é pequeno e assim os mesmos números servem o JSON e o CSV.
 */

export type DashboardFiltros = {
  ano?: string | null;
  id_campus?: number | null;
  turno?: string | null;
  id_edital?: number | null;
};

export type DashboardCards = {
  ofertas: number;
  vagas: number;
  inscritos: number;
  convocados: number;
  matriculados: number;
  vagas_ociosas: number;
  taxa_ocupacao: number;
  taxa_conversao: number;
};

export type DashboardLinhaCampus = {
  id_campus: number;
  campus: string;
  vagas: number;
  inscritos: number;
  convocados: number;
  matriculados: number;
};

export type DashboardAcVsCotas = {
  ac: { inscritos: number; convocados: number; matriculados: number };
  cotas: { inscritos: number; convocados: number; matriculados: number };
};

export type DashboardLinhaTabela = {
  id_oferta: number;
  edital: string;
  campus: string;
  curso: string;
  turno: string;
  vagas: number;
  inscritos: number;
  convocados: number;
  matriculados: number;
  vagas_ociosas: number;
};

export type DashboardAlerta = {
  nivel: 'aviso' | 'critico';
  mensagem: string;
  id_oferta?: number;
};

export type DashboardInsights = {
  filtros: DashboardFiltros;
  cards: DashboardCards;
  byCampus: DashboardLinhaCampus[];
  acVsCotas: DashboardAcVsCotas;
  table: DashboardLinhaTabela[];
  alerts: DashboardAlerta[];
};

/** Passou da inscrição: já foi chamado em alguma etapa do funil. */
const STATUS_CONVOCADO: StatusCandidatura[] = [
  StatusCandidatura.PRE_SELECIONADO,
  StatusCandidatura.ANALISE_DOCUMENTAL,
  StatusCandidatura.APROVADO,
  StatusCandidatura.MATRICULADO,
];

/** Inscrições que continuam a contar para o edital. */
const STATUS_INSCRITO_INVALIDO: StatusCandidatura[] = [
  StatusCandidatura.CANCELADA,
];

export const DASHBOARD_CSV_COLUMNS = [
  'id_oferta',
  'edital',
  'campus',
  'curso',
  'turno',
  'vagas',
  'inscritos',
  'convocados',
  'matriculados',
  'vagas_ociosas',
] as const;

function percentagem(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

function anoDoEdital(numeroAno?: string | null): string | null {
  const match = /(\d{4})/.exec(numeroAno || '');
  return match ? match[1] : null;
}

/** Escapa segundo o RFC 4180 e usa `;` porque o Excel pt-BR abre assim. */
export function toCsv(
  linhas: Record<string, unknown>[],
  colunas: readonly string[],
): string {
  const escapar = (valor: unknown): string => {
    const texto = valor == null ? '' : String(valor);
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  return [
    colunas.join(';'),
    ...linhas.map((linha) =>
      colunas.map((coluna) => escapar(linha[coluna])).join(';'),
    ),
  ].join('\n');
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
  ) {}

  private async loadOfertas(filtros: DashboardFiltros): Promise<Oferta[]> {
    const ofertas = await this.ofertaRepository.find({
      relations: { edital: true, campus: true, curso: true },
      order: { id: 'ASC' },
    });

    return ofertas.filter((oferta) => {
      if (filtros.id_edital && Number(oferta.id_edital) !== filtros.id_edital) {
        return false;
      }
      if (filtros.id_campus && Number(oferta.id_campus) !== filtros.id_campus) {
        return false;
      }
      if (filtros.turno && oferta.turno !== filtros.turno) return false;
      if (filtros.ano && anoDoEdital(oferta.edital?.numero_ano) !== filtros.ano) {
        return false;
      }
      return true;
    });
  }

  private async loadCandidaturas(
    idsOferta: number[],
  ): Promise<Candidatura[]> {
    if (!idsOferta.length) return [];
    const candidaturas = await this.candidaturaRepository.find({
      where: { id_oferta: In(idsOferta) },
    });
    return candidaturas.filter(
      (candidatura) => !STATUS_INSCRITO_INVALIDO.includes(candidatura.status),
    );
  }

  async getInsights(filtros: DashboardFiltros): Promise<DashboardInsights> {
    const ofertas = await this.loadOfertas(filtros);
    const candidaturas = await this.loadCandidaturas(
      ofertas.map((oferta) => oferta.id),
    );

    const porOferta = new Map<number, Candidatura[]>();
    for (const candidatura of candidaturas) {
      const lista = porOferta.get(Number(candidatura.id_oferta)) ?? [];
      lista.push(candidatura);
      porOferta.set(Number(candidatura.id_oferta), lista);
    }

    const convocado = (candidatura: Candidatura) =>
      STATUS_CONVOCADO.includes(candidatura.status);
    const matriculado = (candidatura: Candidatura) =>
      candidatura.status === StatusCandidatura.MATRICULADO;

    const table: DashboardLinhaTabela[] = ofertas.map((oferta) => {
      const daOferta = porOferta.get(oferta.id) ?? [];
      const matriculados = daOferta.filter(matriculado).length;
      return {
        id_oferta: oferta.id,
        edital: oferta.edital?.numero_ano ?? '',
        campus: oferta.campus?.nome ?? '',
        curso: oferta.curso?.nome ?? '',
        turno: oferta.turno,
        vagas: oferta.vagas_totais ?? 0,
        inscritos: daOferta.length,
        convocados: daOferta.filter(convocado).length,
        matriculados,
        vagas_ociosas: Math.max(0, (oferta.vagas_totais ?? 0) - matriculados),
      };
    });

    const soma = (campo: keyof DashboardLinhaTabela) =>
      table.reduce((total, linha) => total + Number(linha[campo] ?? 0), 0);

    const vagas = soma('vagas');
    const inscritos = soma('inscritos');
    const convocados = soma('convocados');
    const matriculados = soma('matriculados');

    const cards: DashboardCards = {
      ofertas: ofertas.length,
      vagas,
      inscritos,
      convocados,
      matriculados,
      vagas_ociosas: Math.max(0, vagas - matriculados),
      taxa_ocupacao: percentagem(matriculados, vagas),
      taxa_conversao: percentagem(matriculados, convocados),
    };

    const byCampusMap = new Map<number, DashboardLinhaCampus>();
    for (const oferta of ofertas) {
      const idCampus = Number(oferta.id_campus);
      const linha =
        byCampusMap.get(idCampus) ??
        ({
          id_campus: idCampus,
          campus: oferta.campus?.nome ?? `Campus ${idCampus}`,
          vagas: 0,
          inscritos: 0,
          convocados: 0,
          matriculados: 0,
        } satisfies DashboardLinhaCampus);

      const daOferta = porOferta.get(oferta.id) ?? [];
      linha.vagas += oferta.vagas_totais ?? 0;
      linha.inscritos += daOferta.length;
      linha.convocados += daOferta.filter(convocado).length;
      linha.matriculados += daOferta.filter(matriculado).length;
      byCampusMap.set(idCampus, linha);
    }

    const acVsCotas: DashboardAcVsCotas = {
      ac: { inscritos: 0, convocados: 0, matriculados: 0 },
      cotas: { inscritos: 0, convocados: 0, matriculados: 0 },
    };
    for (const candidatura of candidaturas) {
      const balde =
        (candidatura.tipo_vaga ?? COTA_AC) === COTA_AC
          ? acVsCotas.ac
          : acVsCotas.cotas;
      balde.inscritos += 1;
      if (convocado(candidatura)) balde.convocados += 1;
      if (matriculado(candidatura)) balde.matriculados += 1;
    }

    return {
      filtros,
      cards,
      byCampus: [...byCampusMap.values()].sort((a, b) =>
        a.campus.localeCompare(b.campus),
      ),
      acVsCotas,
      table,
      alerts: this.buildAlerts(table),
    };
  }

  /** REQ-6.3: o gestor precisa de ver onde a convocação não virou matrícula. */
  private buildAlerts(table: DashboardLinhaTabela[]): DashboardAlerta[] {
    const alerts: DashboardAlerta[] = [];

    for (const linha of table) {
      const pendentes = linha.convocados - linha.matriculados;
      if (linha.convocados > 0 && pendentes === linha.convocados) {
        alerts.push({
          nivel: 'critico',
          id_oferta: linha.id_oferta,
          mensagem: `${linha.curso} (${linha.campus}): ${linha.convocados} convocados e nenhuma matrícula registada`,
        });
      } else if (pendentes > 0) {
        alerts.push({
          nivel: 'aviso',
          id_oferta: linha.id_oferta,
          mensagem: `${linha.curso} (${linha.campus}): ${pendentes} convocados ainda sem matrícula`,
        });
      }

      if (linha.vagas_ociosas > 0 && linha.inscritos > linha.convocados) {
        alerts.push({
          nivel: 'aviso',
          id_oferta: linha.id_oferta,
          mensagem: `${linha.curso} (${linha.campus}): ${linha.vagas_ociosas} vagas ociosas com lista de espera disponível`,
        });
      }
    }

    return alerts;
  }

  async exportCsv(filtros: DashboardFiltros): Promise<string> {
    const { table } = await this.getInsights(filtros);
    return toCsv(table, DASHBOARD_CSV_COLUMNS);
  }
}
