import { describe, expect, it } from "vitest";
import { StatusCandidatura } from "@repo/types";
import {
  statusCandidaturaToInscricaoStep,
  wizardCotasStepReady,
} from "./inscricao-step";

describe("statusCandidaturaToInscricaoStep", () => {
  it("maps pipeline statuses to stepper indices", () => {
    expect(statusCandidaturaToInscricaoStep(StatusCandidatura.INSCRICAO_RECEBIDA)).toBe(0);
    expect(statusCandidaturaToInscricaoStep(StatusCandidatura.ANALISE_DOCUMENTAL)).toBe(1);
    expect(statusCandidaturaToInscricaoStep(StatusCandidatura.PRE_SELECIONADO)).toBe(2);
    expect(statusCandidaturaToInscricaoStep(StatusCandidatura.APROVADO)).toBe(4);
    expect(statusCandidaturaToInscricaoStep(StatusCandidatura.REPROVADO)).toBe(3);
  });
});

describe("wizardCotasStepReady", () => {
  it("requires escola and cota", () => {
    expect(wizardCotasStepReady("", "")).toBe(false);
    expect(wizardCotasStepReady("pub", "")).toBe(false);
    expect(wizardCotasStepReady("", "nenhuma")).toBe(false);
    expect(wizardCotasStepReady("pub", "nenhuma")).toBe(true);
  });
});
