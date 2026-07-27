import { StatusDocumento } from "@repo/types";
import type { DocUiStatus } from "./types";

/**
 * Maps StatusDocumento → docs-list UI statuses.
 * Empty / unknown → pendente; revisao_manual treated as enviado (under review).
 */
export function statusDocumentoToUi(
  status: StatusDocumento | string | null | undefined,
): DocUiStatus {
  if (!status) return "pendente";
  switch (status) {
    case StatusDocumento.EM_ANALISE:
    case StatusDocumento.APROVADO:
    case StatusDocumento.REVISAO_MANUAL:
      return "enviado";
    case StatusDocumento.REPROVADO:
      return "pendente";
    default:
      return "pendente";
  }
}
