import { describe, expect, it } from "vitest";
import { decodeJwtPayload, maskCpf, firstNameFrom } from "./session";

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
