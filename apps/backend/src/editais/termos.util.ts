import { BadRequestException } from '@nestjs/common';
import { TermosModo } from '@repo/types';

const TERMOS_MODOS = new Set<string>(Object.values(TermosModo));

/**
 * REQ-1.1 / RS01: termos exactly one of PDF | URL | TEXTO.
 * Schema stores a single `termos_modo` + `termos_valor`; this validates the pair.
 */
export function assertTermosOneMode(
  modo: TermosModo | string | undefined,
  valor: string | undefined | null,
): asserts modo is TermosModo {
  if (modo === undefined || modo === null || modo === '') {
    throw new BadRequestException(
      'termos_modo é obrigatório (exatamente um de: PDF, URL, TEXTO)',
    );
  }
  if (!TERMOS_MODOS.has(modo)) {
    throw new BadRequestException(
      `termos_modo inválido: use exatamente um de PDF | URL | TEXTO (recebido: ${String(modo)})`,
    );
  }
  if (valor === undefined || valor === null || !String(valor).trim()) {
    throw new BadRequestException(
      'termos_valor é obrigatório para o modo escolhido',
    );
  }

  const trimmed = String(valor).trim();

  if (modo === TermosModo.URL) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException(
        'termos_modo URL exige URL http(s) válida em termos_valor',
      );
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException(
        'termos_modo URL exige protocolo http ou https',
      );
    }
  }
}

/** Reject payloads that try to send multiple termos channels at once. */
export function assertNoConflictingTermosChannels(body: Record<string, unknown>) {
  const extras = [
    'termos_pdf',
    'termos_url',
    'termos_texto',
    'termos_arquivo',
  ].filter((key) => body[key] !== undefined && body[key] !== null);

  if (extras.length > 0) {
    throw new BadRequestException(
      `Termos aceitam apenas termos_modo + termos_valor (um modo). Remova: ${extras.join(', ')}`,
    );
  }
}
