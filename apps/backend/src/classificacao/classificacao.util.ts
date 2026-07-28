import { ListaClassificacao } from '@repo/types';
import { COTA_AC, type SeatOutcome, type SeatPlan } from './remanescentes.util';

/**
 * W23 — motor de classificação AC ↔ RV (REQ-3.2 / REQ-3.3).
 *
 * Com `fallback_ac_para_rv = true` (Fluxo L) o cotista é avaliado primeiro na
 * ampla concorrência; se entrar por lá ocupa vaga de AC e liberta a da cota.
 * Sem a flag, o cotista concorre apenas na cota que declarou.
 *
 * A ordenação interna é o método do edital; aqui recebe-se já a `ordem`
 * classificatória geral (menor = melhor). Empates ficam fora do MVP.
 */

export type CandidatoClassificavel = {
  id_candidatura: number;
  /** Cota declarada na inscrição; `AC` para ampla concorrência. */
  tipo_cota: string;
  /** Posição classificatória geral segundo o método do edital. */
  ordem: number;
};

export type ClassificadoItem = {
  id_candidatura: number;
  lista: ListaClassificacao;
  /** Lista onde o candidato ficou (pode diferir da cota declarada). */
  tipo_cota: string;
  posicao: number;
  realocado_para_ac: boolean;
};

export type ClassificacaoResultado = {
  chamada_regular: ClassificadoItem[];
  espera: ClassificadoItem[];
  itens: ClassificadoItem[];
  vagas: SeatOutcome[];
};

export type ClassificarOptions = {
  fallbackAcParaRv: boolean;
};

function normalizeCota(tipo?: string | null): string {
  const cota = (tipo || '').trim().toUpperCase();
  return cota || COTA_AC;
}

function porOrdem(
  a: CandidatoClassificavel,
  b: CandidatoClassificavel,
): number {
  if (a.ordem !== b.ordem) return a.ordem - b.ordem;
  return a.id_candidatura - b.id_candidatura;
}

/**
 * Distribui os candidatos pelas vagas da chamada e devolve a lista de chamada
 * regular, a lista de espera e o preenchimento por cota.
 */
export function classificar(
  candidatos: CandidatoClassificavel[],
  plano: SeatPlan[],
  options: ClassificarOptions,
): ClassificacaoResultado {
  const ordenados = [...(candidatos ?? [])]
    .map((candidato) => ({
      ...candidato,
      tipo_cota: normalizeCota(candidato.tipo_cota),
    }))
    .sort(porOrdem);

  const restantes = new Map<string, number>();
  for (const linha of plano ?? []) {
    const cota = normalizeCota(linha.tipo_cota);
    restantes.set(cota, (restantes.get(cota) ?? 0) + Math.max(0, linha.vagas));
  }

  const selecionados: ClassificadoItem[] = [];
  const jaSelecionado = new Set<number>();

  const ocupar = (
    candidato: CandidatoClassificavel,
    cota: string,
    realocado: boolean,
  ) => {
    restantes.set(cota, (restantes.get(cota) ?? 0) - 1);
    jaSelecionado.add(candidato.id_candidatura);
    selecionados.push({
      id_candidatura: candidato.id_candidatura,
      lista: ListaClassificacao.CHAMADA_REGULAR,
      tipo_cota: cota,
      posicao: selecionados.length + 1,
      realocado_para_ac: realocado,
    });
  };

  // 1) Ampla concorrência. Com a flag, todos disputam; sem ela, só quem
  //    declarou AC (REQ-3.2 CA3).
  for (const candidato of ordenados) {
    if ((restantes.get(COTA_AC) ?? 0) <= 0) break;
    const ehCotista = candidato.tipo_cota !== COTA_AC;
    if (ehCotista && !options.fallbackAcParaRv) continue;
    ocupar(candidato, COTA_AC, ehCotista);
  }

  // 2) Cotas, pela mesma ordem geral (REQ-3.3: quem não alcançou a AC cai aqui).
  for (const candidato of ordenados) {
    if (jaSelecionado.has(candidato.id_candidatura)) continue;
    const cota = candidato.tipo_cota;
    if (cota === COTA_AC) continue;
    if ((restantes.get(cota) ?? 0) <= 0) continue;
    ocupar(candidato, cota, false);
  }

  const espera: ClassificadoItem[] = ordenados
    .filter((candidato) => !jaSelecionado.has(candidato.id_candidatura))
    .map((candidato, index) => ({
      id_candidatura: candidato.id_candidatura,
      lista: ListaClassificacao.ESPERA,
      tipo_cota: candidato.tipo_cota,
      posicao: index + 1,
      realocado_para_ac: false,
    }));

  const vagas: SeatOutcome[] = (plano ?? []).map((linha) => {
    const cota = normalizeCota(linha.tipo_cota);
    const preenchidas = selecionados.filter(
      (item) => item.tipo_cota === cota,
    ).length;
    return { tipo_cota: cota, vagas: Math.max(0, linha.vagas), preenchidas };
  });

  return {
    chamada_regular: selecionados,
    espera,
    itens: [...selecionados, ...espera],
    vagas,
  };
}
