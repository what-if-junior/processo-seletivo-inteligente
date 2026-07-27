import { ResultadoEtapa, TipoEtapaProcesso } from "@repo/types";
import type { EtapaProcesso } from "@repo/types";
import type { CronogramaRow, CronogramaSt } from "./types";
import { formatPrazoBr } from "./curso";

const ETAPA_LABELS: Record<TipoEtapaProcesso, string> = {
  [TipoEtapaProcesso.PERIODO_INSCRICOES]: "Período de Inscrições",
  [TipoEtapaProcesso.MANIFESTACAO_INTERESSE]: "Manifestação de Interesse",
  [TipoEtapaProcesso.ENTREGA_DOCUMENTAL]: "Entrega Documental",
  [TipoEtapaProcesso.ANALISE_DOCUMENTAL]: "Análise Documental",
  [TipoEtapaProcesso.PUBLICACAO_RESULTADO_PRELIMINAR]:
    "Publicação do Resultado Preliminar",
  [TipoEtapaProcesso.APRESENTACAO_RECURSO]: "Apresentação de Recurso",
  [TipoEtapaProcesso.ANALISE_RECURSO]: "Análise de Recurso",
  [TipoEtapaProcesso.PUBLICACAO_RESULTADO_FINAL]:
    "Publicação do Resultado Final",
  [TipoEtapaProcesso.MATRICULA]: "Matrícula",
  [TipoEtapaProcesso.ENCERRADO]: "Encerrado",
};

function etapaSt(status: ResultadoEtapa | string): CronogramaSt {
  if (status === ResultadoEtapa.APROVADO) return "done";
  if (status === ResultadoEtapa.PENDENTE) return "active";
  return "pending";
}

/** Best-effort map of per-candidatura etapas → edital-like cronograma rows. */
export function etapaProcessoToCronogramaRow(
  etapa: Pick<
    EtapaProcesso,
    "tipo_etapa" | "status" | "data_realizacao" | "prazo" | "observacoes"
  >,
): CronogramaRow {
  const label =
    ETAPA_LABELS[etapa.tipo_etapa as TipoEtapaProcesso] ??
    String(etapa.tipo_etapa);
  const data = etapa.data_realizacao
    ? formatPrazoBr(etapa.data_realizacao)
    : etapa.prazo
      ? formatPrazoBr(etapa.prazo)
      : "—";
  return {
    data,
    etapa: etapa.observacoes?.trim() ? `${label}: ${etapa.observacoes}` : label,
    st: etapaSt(etapa.status),
  };
}

export function etapasToCronograma(
  etapas: Array<
    Pick<
      EtapaProcesso,
      "tipo_etapa" | "status" | "data_realizacao" | "prazo" | "observacoes"
    >
  >,
): CronogramaRow[] {
  return [...etapas]
    .sort((a, b) => a.data_realizacao.localeCompare(b.data_realizacao))
    .map(etapaProcessoToCronogramaRow);
}
