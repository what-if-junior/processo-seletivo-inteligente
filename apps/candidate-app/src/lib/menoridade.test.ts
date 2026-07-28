import { describe, expect, it } from "vitest";
import {
  isMenorNaData,
  responsavelSubmitIssues,
  MSG_MENOR_RESPONSAVEL_CLIENT,
} from "./menoridade";

describe("isMenorNaData", () => {
  it("marks under-18 on submit date as minor", () => {
    expect(isMenorNaData("2010-07-28", "2026-07-27")).toBe(true);
    expect(isMenorNaData("2008-07-28", "2026-07-27")).toBe(true);
  });

  it("marks exactly 18 on birthday as adult", () => {
    expect(isMenorNaData("2008-07-27", "2026-07-27")).toBe(false);
  });

  it("marks adult birth dates as adult", () => {
    expect(isMenorNaData("1990-01-15", "2026-07-27")).toBe(false);
  });
});

describe("responsavelSubmitIssues", () => {
  const complete = {
    nome: "Maria",
    cpf: "11144477735",
    aceite: true,
    documentoNome: "rg.pdf",
    documentoBase64: "abc",
  };

  it("returns no issues for adults", () => {
    expect(
      responsavelSubmitIssues(false, {
        nome: "",
        cpf: "",
        aceite: false,
        documentoNome: "",
        documentoBase64: "",
      }),
    ).toEqual([]);
  });

  it("requires all fields for minors", () => {
    expect(
      responsavelSubmitIssues(true, {
        nome: "",
        cpf: "",
        aceite: false,
        documentoNome: "",
        documentoBase64: "",
      }).length,
    ).toBeGreaterThan(0);
    expect(responsavelSubmitIssues(true, complete)).toEqual([]);
  });

  it("exposes client copy constant", () => {
    expect(MSG_MENOR_RESPONSAVEL_CLIENT).toMatch(/responsável/i);
  });
});
