import { TipoVagaCandidatura } from "@repo/types";
import type { WizardCota } from "./types";

/**
 * Wizard cotas → TipoVagaCandidatura (W1 enum vocabulary).
 * `renda` → BAIXA_RENDA; escola pública alone → ESCOLA_PUBLICA.
 */
export function tipoVagaFromWizard(
  cota: WizardCota | string,
  escola?: "pub" | "priv" | string,
): TipoVagaCandidatura {
  switch (cota) {
    case "ppi":
      return TipoVagaCandidatura.PPI;
    case "pcd":
      return TipoVagaCandidatura.PCD;
    case "renda":
      return TipoVagaCandidatura.BAIXA_RENDA;
    case "nenhuma":
      if (escola === "pub") return TipoVagaCandidatura.ESCOLA_PUBLICA;
      return TipoVagaCandidatura.AC;
    default:
      return TipoVagaCandidatura.AC;
  }
}
