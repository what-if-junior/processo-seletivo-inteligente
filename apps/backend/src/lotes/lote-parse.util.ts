import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/**
 * W20 — leitura dos ficheiros de lote (REQ-2.8).
 *
 * Aceita CSV (com escolha de codificação, porque as secretarias exportam muito
 * em latin1) e XLSX. O mapeamento coluna→campo é escolhido no wizard e chega
 * como JSON, portanto nada aqui depende dos cabeçalhos serem canónicos.
 */

export const LOTE_ENCODINGS = ['utf-8', 'latin1', 'utf-16le'] as const;
export type LoteEncoding = (typeof LOTE_ENCODINGS)[number];

export type LoteFile = {
  originalname?: string;
  buffer: Buffer;
};

export type ParsedSheet = {
  header: string[];
  rows: string[][];
};

/** Linha já mapeada: campo canónico → valor, mais a linha física do ficheiro. */
export type LoteRow = {
  linha: number;
  dados: Record<string, string>;
};

export function assertEncoding(value?: string | null): LoteEncoding {
  const encoding = (value || 'utf-8').toLowerCase().trim();
  if (!(LOTE_ENCODINGS as readonly string[]).includes(encoding)) {
    throw new BadRequestException(
      `encoding inválido: use ${LOTE_ENCODINGS.join(', ')}`,
    );
  }
  return encoding as LoteEncoding;
}

export function decodeBuffer(buffer: Buffer, encoding: LoteEncoding): string {
  const texto = buffer.toString(encoding as BufferEncoding);
  // Excel prefixa CSV UTF-8 com BOM; sem isto o primeiro cabeçalho não casa.
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

/** Heurística simples: as exportações locais usam `;` e as em inglês `,`. */
export function detectDelimiter(texto: string): string {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const candidatos = [';', ',', '\t'];
  let melhor = ',';
  let maior = 0;
  for (const delimitador of candidatos) {
    const total = primeira.split(delimitador).length - 1;
    if (total > maior) {
      maior = total;
      melhor = delimitador;
    }
  }
  return melhor;
}

export function parseCsv(buffer: Buffer, encoding: LoteEncoding): ParsedSheet {
  const texto = decodeBuffer(buffer, encoding);
  const registos = parse(texto, {
    delimiter: detectDelimiter(texto),
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  const [header = [], ...rows] = registos;
  return { header: header.map((coluna) => String(coluna ?? '')), rows };
}

export function parseXlsx(buffer: Buffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const nome = workbook.SheetNames[0];
  if (!nome) throw new BadRequestException('Planilha vazia');

  const matriz = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[nome], {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });

  const [header = [], ...rows] = matriz;
  return {
    header: header.map((coluna) => String(coluna ?? '').trim()),
    rows: rows.map((linha) =>
      (linha ?? []).map((celula) => String(celula ?? '').trim()),
    ),
  };
}

export function parseLoteFile(
  file: LoteFile | undefined,
  encoding: LoteEncoding,
): ParsedSheet {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Envie um ficheiro CSV ou XLSX');
  }
  const nome = (file.originalname || '').toLowerCase();
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) {
    return parseXlsx(file.buffer);
  }
  if (nome && !nome.endsWith('.csv') && !nome.endsWith('.txt')) {
    throw new BadRequestException('Formato não suportado: use CSV ou XLSX');
  }
  return parseCsv(file.buffer, encoding);
}

/** O wizard envia `{"cpf":"CPF do aluno"}`: campo canónico → cabeçalho. */
export function parseColumnMap(raw?: string | null): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('columnMap deve ser um JSON válido');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('columnMap deve ser um objeto JSON');
  }

  const mapa: Record<string, string> = {};
  for (const [campo, coluna] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (coluna == null || coluna === '') continue;
    mapa[campo] = String(coluna);
  }
  return mapa;
}

function normalizeHeader(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Aplica o columnMap às linhas. Sem mapa para um campo, procura uma coluna com
 * o mesmo nome (sem acentos e sem caixa), o que cobre os ficheiros já no
 * formato do modelo.
 */
export function mapRows(
  sheet: ParsedSheet,
  columnMap: Record<string, string>,
  campos: readonly string[],
): LoteRow[] {
  const indicePorHeader = new Map<string, number>();
  sheet.header.forEach((coluna, indice) => {
    const chave = normalizeHeader(coluna);
    if (chave && !indicePorHeader.has(chave)) indicePorHeader.set(chave, indice);
  });

  const indicePorCampo = new Map<string, number>();
  for (const campo of campos) {
    const alvo = columnMap[campo] ?? campo;
    const indice = indicePorHeader.get(normalizeHeader(alvo));
    if (indice != null) indicePorCampo.set(campo, indice);
  }

  return sheet.rows
    .map((linha, posicao) => {
      const dados: Record<string, string> = {};
      for (const campo of campos) {
        const indice = indicePorCampo.get(campo);
        dados[campo] = indice == null ? '' : String(linha[indice] ?? '').trim();
      }
      // +2: a linha 1 é o cabeçalho e o utilizador conta a partir de 1.
      return { linha: posicao + 2, dados };
    })
    .filter((row) => Object.values(row.dados).some((valor) => valor !== ''));
}
