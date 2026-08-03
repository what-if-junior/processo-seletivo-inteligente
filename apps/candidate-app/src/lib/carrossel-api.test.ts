import { describe, expect, it } from "vitest";
import { resolveCarrosselCta } from "./carrossel-api";

describe("resolveCarrosselCta", () => {
  it("prefers id_edital filter over link", () => {
    expect(
      resolveCarrosselCta({
        id_edital: 12,
        cta_link: "https://example.com",
      }),
    ).toEqual({ kind: "filter_edital", id_edital: 12 });
  });

  it("opens absolute http(s) when no id_edital", () => {
    expect(
      resolveCarrosselCta({
        id_edital: null,
        cta_link: "https://ifb.edu.br/editais",
      }),
    ).toEqual({
      kind: "external",
      url: "https://ifb.edu.br/editais",
    });
  });

  it("falls back to processos", () => {
    expect(
      resolveCarrosselCta({ id_edital: null, cta_link: null }),
    ).toEqual({ kind: "goto_processos" });
    expect(
      resolveCarrosselCta({ id_edital: null, cta_link: "/processos" }),
    ).toEqual({ kind: "goto_processos" });
  });
});
