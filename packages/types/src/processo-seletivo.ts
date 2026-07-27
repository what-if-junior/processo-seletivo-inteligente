import { Cursos } from './cursos';
import { TurnoOferta } from './db-enums';
import {
  ResultadoEtapa,
  StatusCandidatura,
  StatusDocumento,
  StatusRecurso,
  TipoEtapaProcesso,
  TipoIngresso,
  TipoVagaCandidatura,
} from './db-enums';
import { Usuario } from './user';

/** Tabela "Campus": unidade fisica IFB. */
export interface CampusRef {
  id: number;
  nome: string;
}

/** Tabela "Ofertas": edital x curso x campus x turno + vagas. */
export interface Oferta {
  id: number;
  id_edital: number;
  id_curso: number;
  id_campus: number;
  turno: TurnoOferta;
  vagas_totais: number;
  curso?: Cursos;
  campus?: CampusRef;
}

/** Tabela "Candidaturas": inscricao de um usuario em uma oferta/edital. */
export interface Candidatura {
  id: number;
  id_usuario: number;
  id_oferta: number;
  id_edital: number;
  data_inscricao: string;
  status: StatusCandidatura;
  tipo_ingresso?: TipoIngresso | null;
  tipo_vaga: TipoVagaCandidatura;
  protocolo?: string | null;
  usuario?: Usuario;
  oferta?: Oferta;
  documentos?: Documento[];
  etapas?: EtapaProcesso[];
}

/** Tabela "Documentos": binario fica fora do payload JSON. */
export interface Documento {
  id: number;
  id_candidatura: number;
  tipo_documento: string;
  nome_arquivo: string;
  status_documento: StatusDocumento | string;
  criado_em: Date;
}

/** Tabela "Gestores": usuario com atribuicao administrativa. */
export interface Gestor {
  id: number;
  id_usuario: number;
  funcao?: string | null;
  usuario?: Usuario;
}

/** Tabela "Etapas Processo": cronograma/avaliacao por candidatura. */
export interface EtapaProcesso {
  id: number;
  id_candidatura: number;
  id_gestor: number;
  tipo_etapa: TipoEtapaProcesso;
  status: ResultadoEtapa;
  pontuacao?: number | null;
  observacoes: string;
  data_realizacao: string;
  prazo: string;
  candidatura?: Candidatura;
  gestor?: Gestor;
  recursos?: Recurso[];
}

/** Tabela "Recursos": impugnacao de uma etapa pelo candidato. */
export interface Recurso {
  id: number;
  id_etapa_processo: number;
  id_gestor: number;
  data_solicitacao: string;
  titulo: string;
  nome_anexo: string;
  status: StatusRecurso;
  observacoes: string;
  etapa?: EtapaProcesso;
  gestor?: Gestor;
}
