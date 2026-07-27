import { BadRequestException } from '@nestjs/common';
import { ModoEntrega, SubtipoEntregaOnline } from '@repo/types';
import {
  assertEntregaFields,
  uploadsOcultos,
} from './entrega-documental-validation.util';

describe('entrega-documental-validation.util', () => {
  it('requires local_nome and endereco for PRESENCIAL', () => {
    expect(() =>
      assertEntregaFields({
        modo: ModoEntrega.PRESENCIAL,
        local_nome: 'Sala 1',
        endereco: '',
      }),
    ).toThrow(BadRequestException);

    const ok = assertEntregaFields({
      modo: ModoEntrega.PRESENCIAL,
      local_nome: 'Sala 1',
      endereco: 'Rua A',
      horario: '8h',
      contactos: 'x@y.z',
      subtipo_online: SubtipoEntregaOnline.UPLOAD_NATIVO_PWA,
      url_externa: 'https://x',
    });
    expect(ok.subtipo_online).toBeNull();
    expect(ok.url_externa).toBeNull();
    expect(ok.horario).toBe('8h');
    expect(uploadsOcultos(ok.modo)).toBe(true);
  });

  it('requires subtipo for ONLINE and subtype-specific fields', () => {
    expect(() =>
      assertEntregaFields({ modo: ModoEntrega.ONLINE }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertEntregaFields({
        modo: ModoEntrega.ONLINE,
        subtipo_online: SubtipoEntregaOnline.URL_FORMULARIO_EXTERNO,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertEntregaFields({
        modo: ModoEntrega.ONLINE,
        subtipo_online: SubtipoEntregaOnline.EMAIL_INSTITUCIONAL,
      }),
    ).toThrow(BadRequestException);

    const upload = assertEntregaFields({
      modo: ModoEntrega.ONLINE,
      subtipo_online: SubtipoEntregaOnline.UPLOAD_NATIVO_PWA,
      instrucoes: 'via PWA',
    });
    expect(uploadsOcultos(upload.modo)).toBe(false);
    expect(upload.local_nome).toBeNull();

    const url = assertEntregaFields({
      modo: ModoEntrega.ONLINE,
      subtipo_online: SubtipoEntregaOnline.URL_FORMULARIO_EXTERNO,
      url_externa: 'https://forms.example/x',
      email_institucional: 'ignore@x.com',
    });
    expect(url.url_externa).toBe('https://forms.example/x');
    expect(url.email_institucional).toBeNull();
  });
});
