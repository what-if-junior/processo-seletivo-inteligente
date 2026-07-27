import { MetodoSelecao, MeritoTipo, TermosModo } from '@repo/types';

export class CreateEditalDto {
  numero_ano: string;
  metodo_selecao: MetodoSelecao;
  merito_tipo?: MeritoTipo | null;
  is_simplificado?: boolean;
  fallback_ac_para_rv?: boolean;
  termos_modo: TermosModo;
  termos_valor: string;
  link_oficial?: string | null;
  publicado?: boolean;
  inscricoes_abertas?: boolean;
}
