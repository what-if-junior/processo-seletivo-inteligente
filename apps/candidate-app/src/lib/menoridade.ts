/** Majority age for REQ-2.4 (idade na data do submit). */
export const IDADE_MAIORIDADE = 18;

export const MSG_MENOR_RESPONSAVEL_CLIENT =
  "Como menor de idade na data da inscrição, informe nome e CPF do responsável, aceite o termo e anexe o documento.";

/**
 * Full calendar years between birth and reference (YYYY-MM-DD).
 * True when age at `dataRef` is strictly less than majority.
 */
export function isMenorNaData(
  dataNascimento: string,
  dataRef: string,
  majority = IDADE_MAIORIDADE,
): boolean {
  const birth = parseIsoDate(dataNascimento);
  const ref = parseIsoDate(dataRef);
  if (!birth || !ref) return false;
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = ref.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && ref.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age < majority;
}

function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export type ResponsavelForm = {
  nome: string;
  cpf: string;
  aceite: boolean;
  documentoNome: string;
  documentoBase64: string;
};

/** Client-side mirror of Nest gate for minors (adult → no issues). */
export function responsavelSubmitIssues(
  isMenor: boolean,
  form: ResponsavelForm,
): string[] {
  if (!isMenor) return [];
  const issues: string[] = [];
  if (!form.nome.trim()) issues.push("Nome do responsável é obrigatório.");
  if (form.cpf.replace(/\D/g, "").length < 11) {
    issues.push("CPF do responsável é obrigatório.");
  }
  if (!form.aceite) {
    issues.push("Aceite do responsável é obrigatório.");
  }
  if (!form.documentoBase64 || !form.documentoNome.trim()) {
    issues.push("Documento do responsável é obrigatório.");
  }
  return issues;
}

/** Read a File as base64 payload (no data-URL prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}
