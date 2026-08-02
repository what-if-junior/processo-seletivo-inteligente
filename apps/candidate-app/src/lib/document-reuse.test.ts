import { describe, expect, it } from "vitest";
import {
  appendEspelharMeusDados,
  matchDocumentoConta,
  normalizeDocTipoNome,
} from "./document-reuse";

describe("document-reuse match helper", () => {
  it("normalizes accents and whitespace", () => {
    expect(normalizeDocTipoNome("  RG / CNH  ")).toBe("rg / cnh");
    expect(normalizeDocTipoNome("Histórico Escolar")).toBe("historico escolar");
  });

  it("matches by id_tipo_base then nome", () => {
    expect(
      matchDocumentoConta(
        { id_tipo_base: 4, nome: "RG" },
        [
          { id: 10, id_tipo_base: 4, tipo_nome: "Outro" },
          { id: 11, id_tipo_base: 9, tipo_nome: "RG" },
        ],
      ),
    ).toEqual({ id: 10, match_by: "id_tipo_base" });

    expect(
      matchDocumentoConta(
        { id_tipo_base: null, nome: "CPF" },
        [{ id: 2, id_tipo_base: 1, tipo_nome: "cpf" }],
      ),
    ).toEqual({ id: 2, match_by: "nome" });

    expect(
      matchDocumentoConta(
        { id_tipo_base: 99, nome: "Laudo" },
        [{ id: 2, id_tipo_base: 1, tipo_nome: "CPF" }],
      ),
    ).toBeNull();
  });
});

describe("espelhar_meus_dados plumbing", () => {
  it("appends multipart flag only when true", () => {
    const withFlag = appendEspelharMeusDados(new FormData(), true);
    expect(withFlag.get("espelhar_meus_dados")).toBe("true");

    const without = appendEspelharMeusDados(new FormData(), false);
    expect(without.get("espelhar_meus_dados")).toBeNull();

    const omitted = appendEspelharMeusDados(new FormData(), undefined);
    expect(omitted.get("espelhar_meus_dados")).toBeNull();
  });
});
