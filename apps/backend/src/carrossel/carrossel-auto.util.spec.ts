import { TipoCarrossel } from '@repo/types';
import {
  AUTO_DEFAULT_CTA_TEXTO,
  AUTO_DEFAULT_ICONE,
  AUTO_DEFAULT_ROTULO,
  AUTO_DEFAULT_SUBTITULO,
  buildAutoEditalDefaults,
} from './carrossel-auto.util';

describe('carrossel-auto.util', () => {
  it('builds locked default copy from edital numero_ano', () => {
    const d = buildAutoEditalDefaults({ id: 7, numero_ano: '001/2026' });
    expect(d).toEqual({
      tipo: TipoCarrossel.AUTO_EDITAL,
      rotulo: AUTO_DEFAULT_ROTULO,
      titulo: '001/2026',
      subtitulo: AUTO_DEFAULT_SUBTITULO,
      cta_texto: AUTO_DEFAULT_CTA_TEXTO,
      cta_link: null,
      imagem_url: null,
      icone: AUTO_DEFAULT_ICONE,
      ativo: true,
      id_edital: 7,
      auto_edital_habilitado: true,
      inicio_em: null,
      fim_em: null,
    });
  });
});
