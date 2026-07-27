import { TipoVagaCandidatura } from "@repo/types";
import type { WizardCota } from "./types";

/**
 * Wizard cotas → TipoVagaCandidatura.
 * `renda` maps to escola_publica as partial stand-in (no dedicated enum).
 * Escola pública alone (without cota) → escola_publica when cota is nenhuma.
 */
export function tipoVagaFromWizard(
  cota: WizardCota | string,
  escola?: "pub" | "priv" | string,
): TipoVagaCandidatura {
  switch (cota) {
    case "ppi":
      return TipoVagaCandidatura.PII;
    case "pcd":
      return TipoVagaCandidatura.PCD;
    case "renda":
      return TipoVagaCandidatura.ESCOLA_PUBLICA;
    case "nenhuma":
      if (escola === "pub") return TipoVagaCandidatura.ESCOLA_PUBLICA;
      return TipoVagaCandidatura.AC;
    default:
      return TipoVagaCandidatura.AC;
  }
}
