import { describe, expect, it } from "vitest";
import { inferNotifTipo, relativeTime } from "./notificacoes-api";

describe("inferNotifTipo", () => {
  it("maps rejection / approval / cronograma", () => {
    expect(inferNotifTipo("Documento rejeitado", "manual")).toBe("erro");
    expect(inferNotifTipo("Documento homologado", "manual")).toBe("sucesso");
    expect(
      inferNotifTipo("Prazo de matrícula", "automatico_cronograma"),
    ).toBe("aviso");
    expect(inferNotifTipo("Aviso geral", "manual")).toBe("info");
  });
});

describe("relativeTime", () => {
  it("formats recent timestamps", () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeTime(recent)).toMatch(/Há 5 min/);
  });
});
