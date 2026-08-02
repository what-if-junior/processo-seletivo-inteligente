import { describe, expect, it } from "vitest";
import { buildImpugnacaoMailto } from "./contestacoes-api";

describe("contestacoes-api", () => {
  it("builds mailto from IMPUGNACAO_EMAIL template", () => {
    const href = buildImpugnacaoMailto({
      templateCorpo: "Edital {{edital}}\n{{texto}}\n{{nome}} <{{email}}>",
      editalId: 3,
      nome: "Ana",
      email: "ana@x.com",
      texto: "Fundamento",
      to: "comissao@if.edu",
    });
    expect(href.startsWith("mailto:comissao@if.edu?")).toBe(true);
    expect(href).toContain(encodeURIComponent("Edital 3"));
    expect(href).toContain(encodeURIComponent("Fundamento"));
  });
});
