import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ListaClassificacao, StatusCandidatura } from '@repo/types';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import {
  classificar,
  type CandidatoClassificavel,
} from '../classificacao/classificacao.util';
import {
  computeRemanescentes,
  distribuicaoToSeatPlan,
  planoProximaChamada,
  totalVagas,
  type SeatPlan,
} from '../classificacao/remanescentes.util';
import { Chamada } from './entities/chamada.entity';
import { ChamadaVaga } from './entities/chamada-vaga.entity';
import { ClassificacaoItem } from './entities/classificacao-item.entity';
import { normalizarCpfs } from './matriculados.util';

/** Quem já saiu do funil não volta a ser convocado. */
const STATUS_FORA_DO_FUNIL: StatusCandidatura[] = [
  StatusCandidatura.CANCELADA,
  StatusCandidatura.REPROVADO,
  StatusCandidatura.DESCLASSIFICADA,
  StatusCandidatura.MATRICULADO,
];

export type GerarChamadaOptions = {
  id_oferta: number;
  observacao?: string | null;
  /** Sobrepõe o flag do edital só nesta chamada (REQ-3.2). */
  fallback_ac_para_rv?: boolean;
};

export type ImportarMatriculadosResult = {
  matriculados: number;
  nao_encontrados: string[];
};

/**
 * W24 / W25 — geração de chamadas, listas de espera e matrícula (REQ-3.1 a 3.5).
 */
@Injectable()
export class ChamadasService {
  constructor(
    @InjectRepository(Chamada)
    private readonly chamadaRepository: Repository<Chamada>,
    @InjectRepository(ChamadaVaga)
    private readonly chamadaVagaRepository: Repository<ChamadaVaga>,
    @InjectRepository(ClassificacaoItem)
    private readonly classificacaoItemRepository: Repository<ClassificacaoItem>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
  ) {}

  async findByOferta(idOferta: number): Promise<Chamada[]> {
    return this.chamadaRepository.find({
      where: { id_oferta: idOferta },
      relations: { vagas: true },
      order: { numero: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Chamada> {
    const chamada = await this.chamadaRepository.findOne({
      where: { id },
      relations: {
        vagas: true,
        itens: { candidatura: { usuario: true } },
      },
    });
    if (!chamada) throw new NotFoundException(`Chamada ${id} não encontrada`);
    return chamada;
  }

  /**
   * 1ª chamada usa a DistribuicaoCotas da oferta; as seguintes recebem, como
   * ampla concorrência, tudo o que sobrou da anterior (REQ-3.1 CA3).
   */
  private async buildPlano(
    oferta: Oferta,
    anterior?: Chamada,
  ): Promise<SeatPlan[]> {
    if (!anterior) {
      return distribuicaoToSeatPlan(
        (oferta.distribuicao_cotas ?? []).map((cota) => ({
          tipo_cota: cota.tipo_cota,
          vagas: cota.vagas,
          percentual: cota.percentual,
        })),
        oferta.vagas_totais,
      );
    }

    return planoProximaChamada(
      (anterior.vagas ?? []).map((vaga) => ({
        tipo_cota: vaga.tipo_cota,
        vagas: vaga.vagas,
        preenchidas: vaga.preenchidas,
      })),
    );
  }

  private async idsJaConvocados(idOferta: number): Promise<number[]> {
    const chamadas = await this.chamadaRepository.find({
      where: { id_oferta: idOferta },
      select: { id: true },
    });
    if (!chamadas.length) return [];

    const itens = await this.classificacaoItemRepository.find({
      where: {
        id_chamada: In(chamadas.map((chamada) => chamada.id)),
        lista: ListaClassificacao.CHAMADA_REGULAR,
      },
      select: { id: true, id_candidatura: true },
    });
    return itens.map((item) => item.id_candidatura);
  }

  private async candidatosElegiveis(
    idOferta: number,
  ): Promise<CandidatoClassificavel[]> {
    const convocados = new Set(await this.idsJaConvocados(idOferta));
    const candidaturas = await this.candidaturaRepository.find({
      where: { id_oferta: idOferta },
      order: { id: 'ASC' },
    });

    return candidaturas
      .filter(
        (candidatura) =>
          !STATUS_FORA_DO_FUNIL.includes(candidatura.status) &&
          !convocados.has(candidatura.id),
      )
      // Sem sorteio/mérito persistido, a ordem de chegada é o desempate do MVP.
      .map((candidatura, indice) => ({
        id_candidatura: candidatura.id,
        tipo_cota: candidatura.tipo_vaga,
        ordem: indice + 1,
      }));
  }

  /** Gera a próxima chamada da oferta e devolve-a já com vagas e listas. */
  async gerar(options: GerarChamadaOptions): Promise<Chamada> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id: options.id_oferta },
      relations: { distribuicao_cotas: true, edital: true },
    });
    if (!oferta) {
      throw new NotFoundException(`Oferta ${options.id_oferta} não encontrada`);
    }

    const anteriores = await this.findByOferta(oferta.id);
    const anterior = anteriores[anteriores.length - 1];
    const plano = await this.buildPlano(oferta, anterior);
    if (totalVagas(plano) === 0) {
      throw new BadRequestException(
        'Não há vagas remanescentes para uma nova chamada nesta oferta',
      );
    }

    const flagDoEdital =
      options.fallback_ac_para_rv ??
      oferta.edital?.fallback_ac_para_rv ??
      false;
    // REQ-3.1 CA3: as vagas remanescentes voltam como AC e são disputadas por
    // todos na ordem geral, mesmo com o fallback do edital desligado.
    const fallbackAcParaRv = flagDoEdital || Boolean(anterior);

    const candidatos = await this.candidatosElegiveis(oferta.id);
    const resultado = classificar(candidatos, plano, { fallbackAcParaRv });
    const remanescentes = new Map(
      computeRemanescentes(resultado.vagas).map((linha) => [
        linha.tipo_cota,
        linha.remanescentes,
      ]),
    );

    const chamadaId = await this.chamadaRepository.manager.transaction(
      async (em) => {
        const chamada = await em.save(
          em.create(Chamada, {
            numero: (anterior?.numero ?? 0) + 1,
            fallback_ac_para_rv: fallbackAcParaRv,
            observacao: options.observacao ?? null,
            oferta: { id: oferta.id } as Oferta,
          }),
        );

        const vagas = resultado.vagas.map((linha) =>
          em.create(ChamadaVaga, {
            tipo_cota: linha.tipo_cota,
            vagas: linha.vagas,
            preenchidas: linha.preenchidas,
            remanescentes: remanescentes.get(linha.tipo_cota) ?? 0,
            chamada: { id: chamada.id } as Chamada,
          }),
        );
        if (vagas.length) await em.save(vagas);

        const itens = resultado.itens.map((item) =>
          em.create(ClassificacaoItem, {
            lista: item.lista,
            tipo_cota: item.tipo_cota,
            posicao: item.posicao,
            realocado_para_ac: item.realocado_para_ac,
            chamada: { id: chamada.id } as Chamada,
            candidatura: { id: item.id_candidatura } as Candidatura,
          }),
        );
        if (itens.length) await em.save(itens);

        // REQ-3.4: convocado passa a pré-selecionado e segue para a documental.
        const convocados = resultado.chamada_regular.map(
          (item) => item.id_candidatura,
        );
        if (convocados.length) {
          await em.update(Candidatura, convocados, {
            status: StatusCandidatura.PRE_SELECIONADO,
          });
        }

        return chamada.id;
      },
    );

    return this.findOne(chamadaId);
  }

  /** REQ-3.5: o campus devolve os CPFs que efetivaram matrícula. */
  async importarMatriculadosPorChamada(
    idChamada: number,
    cpfs: (string | number)[],
  ): Promise<ImportarMatriculadosResult> {
    const chamada = await this.chamadaRepository.findOne({
      where: { id: idChamada },
    });
    if (!chamada) {
      throw new NotFoundException(`Chamada ${idChamada} não encontrada`);
    }
    return this.importarMatriculados(chamada.id_oferta, cpfs);
  }

  async importarMatriculados(
    idOferta: number,
    cpfs: (string | number)[],
  ): Promise<ImportarMatriculadosResult> {
    const alvo = normalizarCpfs(cpfs);
    if (!alvo.length) {
      throw new BadRequestException('Envie ao menos um CPF válido');
    }

    const candidaturas = await this.candidaturaRepository.find({
      where: { id_oferta: idOferta },
      relations: { usuario: true },
    });

    const porCpf = new Map<string, Candidatura>();
    for (const candidatura of candidaturas) {
      const cpf = (candidatura.usuario?.CPF || '').replace(/\D/g, '');
      if (cpf) porCpf.set(cpf, candidatura);
    }

    const encontradas: number[] = [];
    const nao_encontrados: string[] = [];
    for (const cpf of alvo) {
      const candidatura = porCpf.get(cpf);
      if (candidatura) encontradas.push(candidatura.id);
      else nao_encontrados.push(cpf);
    }

    if (encontradas.length) {
      await this.candidaturaRepository.update(encontradas, {
        status: StatusCandidatura.MATRICULADO,
      });
    }

    return { matriculados: encontradas.length, nao_encontrados };
  }

  /**
   * Stub de notificação: o disparo real (e-mail/push) entra com o módulo de
   * Notificacoes; aqui só se reporta quantos seriam avisados.
   */
  async notificar(idChamada: number): Promise<{ notified: number }> {
    const total = await this.classificacaoItemRepository.count({
      where: {
        id_chamada: idChamada,
        lista: ListaClassificacao.CHAMADA_REGULAR,
      },
    });
    if (!total) {
      const existe = await this.chamadaRepository.exists({
        where: { id: idChamada },
      });
      if (!existe) {
        throw new NotFoundException(`Chamada ${idChamada} não encontrada`);
      }
    }
    return { notified: total };
  }
}
