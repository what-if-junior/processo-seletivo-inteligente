import { TipoCarrossel } from '@repo/types';

export const AUTO_DEFAULT_ROTULO = 'Inscrições abertas';
export const AUTO_DEFAULT_SUBTITULO =
  'Vagas para cursos técnicos e superiores';
export const AUTO_DEFAULT_CTA_TEXTO = 'Ver editais';
export const AUTO_DEFAULT_ICONE = 'GraduationCap';

export type AutoEditalSource = {
  id: number;
  numero_ano: string;
};

export type AutoCarrosselDefaults = {
  tipo: TipoCarrossel;
  rotulo: string;
  titulo: string;
  subtitulo: string;
  cta_texto: string;
  cta_link: null;
  imagem_url: null;
  icone: string;
  ativo: boolean;
  id_edital: number;
  auto_edital_habilitado: boolean;
  inicio_em: null;
  fim_em: null;
};

/** Default copy for a new auto_edital row (plan locked defaults). */
export function buildAutoEditalDefaults(
  edital: AutoEditalSource,
): AutoCarrosselDefaults {
  return {
    tipo: TipoCarrossel.AUTO_EDITAL,
    rotulo: AUTO_DEFAULT_ROTULO,
    titulo: edital.numero_ano,
    subtitulo: AUTO_DEFAULT_SUBTITULO,
    cta_texto: AUTO_DEFAULT_CTA_TEXTO,
    cta_link: null,
    imagem_url: null,
    icone: AUTO_DEFAULT_ICONE,
    ativo: true,
    id_edital: edital.id,
    auto_edital_habilitado: true,
    inicio_em: null,
    fim_em: null,
  };
}
