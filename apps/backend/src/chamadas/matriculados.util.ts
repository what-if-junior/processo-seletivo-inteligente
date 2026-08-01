/** W25 — os campi devolvem a matrícula como uma lista simples de CPFs (REQ-3.5). */
export function cpfsDoArquivo(buffer?: Buffer | null): string[] {
  if (!buffer?.length) return [];
  return normalizarCpfs(buffer.toString('utf-8').split(/[\r\n;,\t]+/));
}

export function normalizarCpfs(valores: (string | number)[]): string[] {
  const vistos = new Set<string>();
  for (const valor of valores ?? []) {
    const cpf = String(valor ?? '').replace(/\D/g, '');
    if (cpf.length === 11) vistos.add(cpf);
  }
  return [...vistos];
}
