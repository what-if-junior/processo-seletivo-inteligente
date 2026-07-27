import { BadRequestException } from '@nestjs/common';
import { ModoEntrega, SubtipoEntregaOnline } from '@repo/types';

export type EntregaInput = {
  modo: ModoEntrega | string;
  local_nome?: string | null;
  endereco?: string | null;
  horario?: string | null;
  contactos?: string | null;
  subtipo_online?: SubtipoEntregaOnline | string | null;
  url_externa?: string | null;
  email_institucional?: string | null;
  instrucoes?: string | null;
};

export function assertModoEntrega(modo: string): ModoEntrega {
  if (!Object.values(ModoEntrega).includes(modo as ModoEntrega)) {
    throw new BadRequestException(`modo inválido: ${modo}`);
  }
  return modo as ModoEntrega;
}

export function assertSubtipoOnline(
  subtipo: string | null | undefined,
): SubtipoEntregaOnline {
  if (
    !subtipo ||
    !Object.values(SubtipoEntregaOnline).includes(
      subtipo as SubtipoEntregaOnline,
    )
  ) {
    throw new BadRequestException(
      `subtipo_online inválido ou ausente: ${subtipo ?? '(vazio)'}`,
    );
  }
  return subtipo as SubtipoEntregaOnline;
}

/** Hard rules for PRESENCIAL / ONLINE (+ subtype fields). */
export function assertEntregaFields(input: EntregaInput): {
  modo: ModoEntrega;
  local_nome: string | null;
  endereco: string | null;
  horario: string | null;
  contactos: string | null;
  subtipo_online: SubtipoEntregaOnline | null;
  url_externa: string | null;
  email_institucional: string | null;
  instrucoes: string | null;
} {
  const modo = assertModoEntrega(input.modo);
  const instrucoes = input.instrucoes?.trim() || null;

  if (modo === ModoEntrega.PRESENCIAL) {
    const local_nome = input.local_nome?.trim() || '';
    const endereco = input.endereco?.trim() || '';
    if (!local_nome || !endereco) {
      throw new BadRequestException(
        'PRESENCIAL exige local_nome e endereco',
      );
    }
    return {
      modo,
      local_nome,
      endereco,
      horario: input.horario?.trim() || null,
      contactos: input.contactos?.trim() || null,
      subtipo_online: null,
      url_externa: null,
      email_institucional: null,
      instrucoes,
    };
  }

  const subtipo_online = assertSubtipoOnline(input.subtipo_online);
  let url_externa: string | null = input.url_externa?.trim() || null;
  let email_institucional: string | null =
    input.email_institucional?.trim() || null;

  if (subtipo_online === SubtipoEntregaOnline.URL_FORMULARIO_EXTERNO) {
    if (!url_externa) {
      throw new BadRequestException(
        'URL_FORMULARIO_EXTERNO exige url_externa',
      );
    }
    email_institucional = null;
  } else if (subtipo_online === SubtipoEntregaOnline.EMAIL_INSTITUCIONAL) {
    if (!email_institucional) {
      throw new BadRequestException(
        'EMAIL_INSTITUCIONAL exige email_institucional',
      );
    }
    url_externa = null;
  } else {
    url_externa = null;
    email_institucional = null;
  }

  return {
    modo,
    local_nome: null,
    endereco: null,
    horario: null,
    contactos: null,
    subtipo_online,
    url_externa,
    email_institucional,
    instrucoes,
  };
}

export function uploadsOcultos(modo: ModoEntrega): boolean {
  return modo === ModoEntrega.PRESENCIAL;
}
