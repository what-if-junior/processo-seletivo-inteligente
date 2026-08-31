import { afterEach, describe, expect, it, vi } from "vitest";
import {
  docsChecklistUiState,
  fetchDocsChecklist,
  type DocsChecklist,
} from "./docs-checklist";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubApi(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    }),
  );
}

describe("fetchDocsChecklist (W26-06)", () => {
  it("normalizes a full checklist payload", async () => {
    stubApi({
      exigencias: [
        {
          id_tipo_documento: 1,
          nome: "RG",
          id_tipo_base: 4,
          fase: "INSCRICAO",
          obrigatorio: true,
          match: null,
        },
      ],
      configurado: true,
      pode_upload: true,
      uploads_ocultos: false,
      entrega: {
        configurado: true,
        pode_upload: true,
        uploads_ocultos: false,
        modo: "ONLINE",
        subtipo_online: "UPLOAD_NATIVO_PWA",
      },
    });

    const result = await fetchDocsChecklist(7);
    expect(result.exigencias).toHaveLength(1);
    expect(result.exigencias[0]?.nome).toBe("RG");
    expect(result.configurado).toBe(true);
    expect(result.pode_upload).toBe(true);
    expect(result.uploads_ocultos).toBe(false);
    expect(result.entrega?.modo).toBe("ONLINE");
  });

  it("normalizes unconfigured payload (honest empty state)", async () => {
    stubApi({ exigencias: [], configurado: false });

    const result = await fetchDocsChecklist(7);
    expect(result.configurado).toBe(false);
    expect(result.pode_upload).toBe(false);
    expect(result.uploads_ocultos).toBe(false);
    expect(result.exigencias).toEqual([]);
    expect(result.entrega).toBeNull();
  });
});

describe("docsChecklistUiState (W26-06 fail-closed)", () => {
  const uploadChecklist: DocsChecklist = {
    exigencias: [],
    configurado: true,
    pode_upload: true,
    uploads_ocultos: false,
    entrega: {
      configurado: true,
      pode_upload: true,
      uploads_ocultos: false,
      modo: "ONLINE",
      subtipo_online: "UPLOAD_NATIVO_PWA",
    },
  };

  const presencialChecklist: DocsChecklist = {
    exigencias: [],
    configurado: true,
    pode_upload: false,
    uploads_ocultos: true,
    entrega: {
      configurado: true,
      pode_upload: false,
      uploads_ocultos: true,
      modo: "PRESENCIAL",
      local_nome: "Secretaria Acadêmica",
    },
  };

  const emailChecklist: DocsChecklist = {
    exigencias: [],
    configurado: true,
    pode_upload: false,
    uploads_ocultos: false,
    entrega: {
      configurado: true,
      pode_upload: false,
      uploads_ocultos: false,
      modo: "ONLINE",
      subtipo_online: "EMAIL_INSTITUCIONAL",
      email_institucional: "docs@ifb.edu.br",
    },
  };

  it("mock mode → mock", () => {
    expect(docsChecklistUiState(null, { isMock: true })).toEqual({
      kind: "mock",
    });
  });

  it("no meta yet → loading", () => {
    expect(docsChecklistUiState(null, { isMock: false })).toEqual({
      kind: "loading",
    });
  });

  it("unconfigured → unconfigured (honest empty, not mock catalogue)", () => {
    const state = docsChecklistUiState(
      {
        exigencias: [],
        configurado: false,
        pode_upload: false,
        uploads_ocultos: false,
        entrega: null,
      },
      { isMock: false },
    );
    expect(state).toEqual({ kind: "unconfigured" });
  });

  it("presencial → presencial", () => {
    const state = docsChecklistUiState(presencialChecklist, {
      isMock: false,
    });
    expect(state.kind).toBe("presencial");
    if (state.kind === "presencial") {
      expect(state.entrega.local_nome).toBe("Secretaria Acadêmica");
    }
  });

  it("email/form external → canal_externo", () => {
    const state = docsChecklistUiState(emailChecklist, { isMock: false });
    expect(state.kind).toBe("canal_externo");
    if (state.kind === "canal_externo") {
      expect(state.entrega.email_institucional).toBe("docs@ifb.edu.br");
    }
  });

  it("UPLOAD_NATIVO_PWA → upload", () => {
    const state = docsChecklistUiState(uploadChecklist, { isMock: false });
    expect(state.kind).toBe("upload");
  });
});