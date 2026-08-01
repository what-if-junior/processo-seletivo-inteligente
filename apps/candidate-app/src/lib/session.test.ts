import { describe, expect, it } from "vitest";
import {
  decodeJwtPayload,
  maskCpf,
  firstNameFrom,
  profileMinimumIssues,
} from "./session";
import type { Usuario } from "@repo/types";
import { mergeDocumentoContaSlots } from "./documentos-conta";

describe("session helpers", () => {
  it("decodes JWT payload without verification", () => {
    const payload = btoa(JSON.stringify({ sub: 42, email: "a@b.com" }));
    const token = `hdr.${payload}.sig`;
    expect(decodeJwtPayload(token)).toEqual({ sub: 42, email: "a@b.com" });
  });

  it("masks CPF keeping last two digits", () => {
    expect(maskCpf("12345678912")).toBe("CPF: ***.***.***-12");
  });

  it("extracts first name", () => {
    expect(firstNameFrom("João da Silva")).toBe("João");
  });
});

describe("profileMinimumIssues", () => {
  const base: Usuario = {
    id: 1,
    nome_completo: "João da Silva",
    email: "joao@teste.com",
    CPF: "123.456.789-00",
    data_nascimento: "1995-05-20",
    telefone: "11999999999",
    pcd: false,
    ativo: true,
    enderecos: [
      {
        id: 1,
        id_usuario: 1,
        estado: "DF",
        cidade: "Brasília",
        CEP: "70000000",
        logradouro: "SQN",
        bairro: "Asa Norte",
        numero_residencia: "1",
      },
    ],
  };

  it("returns login issue when user missing", () => {
    expect(profileMinimumIssues(null)).toContain("Faça login para continuar.");
  });

  it("passes complete profile", () => {
    expect(profileMinimumIssues(base)).toEqual([]);
  });

  it("flags missing telefone and endereço", () => {
    const issues = profileMinimumIssues({
      ...base,
      telefone: "",
      enderecos: [],
    });
    expect(issues.some((i) => i.includes("Telefone"))).toBe(true);
    expect(issues.some((i) => i.includes("Endereço"))).toBe(true);
  });
});

describe("mergeDocumentoContaSlots", () => {
  it("attaches current file per tipo base", () => {
    const slots = mergeDocumentoContaSlots(
      [
        { id: 1, nome: "RG", formatos: ["pdf"], ativo: true },
        { id: 2, nome: "CPF", formatos: ["pdf"], ativo: true },
      ],
      [
        {
          id: 10,
          id_usuario: 1,
          id_tipo_base: 2,
          nome_arquivo: "cpf.pdf",
          mime: "application/pdf",
          atualizado_em: "2026-01-01",
          tipo_nome: "CPF",
          tipo_formatos: ["pdf"],
        },
      ],
    );
    expect(slots).toHaveLength(2);
    expect(slots[0]!.current).toBeUndefined();
    expect(slots[1]!.current?.nome_arquivo).toBe("cpf.pdf");
  });
});
