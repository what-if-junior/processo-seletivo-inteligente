import {
  StatusCandidatura,
  StatusDocumento,
  TipoVagaCandidatura,
  TurnoOferta,
  type Candidatura,
  type Cursos,
  type Documento,
  type Oferta,
  type Usuario,
} from "@repo/types";

export type DataSource = "api" | "mock";

export type AdminInscricao = Candidatura & {
  observacoes_admin?: string;
  escola?: string;
  ano_conclusao?: string;
  necessidades_especiais?: string;
};

export type AdminCandidatoRow = {
  id: number;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  data_cadastro: string;
  telefone?: string;
};

const mockUsers: Usuario[] = [
  {
    id: 1,
    nome_completo: "João Silva",
    email: "joao.silva@email.com",
    CPF: "11144477735",
    data_nascimento: "2000-05-12",
    telefone: "(61) 99999-1111",
    pcd: false,
    ativo: true,
    criado_em: new Date("2025-01-10"),
  },
  {
    id: 2,
    nome_completo: "Maria Santos",
    email: "maria.santos@email.com",
    CPF: "52998224725",
    data_nascimento: "1999-08-21",
    telefone: "(61) 98888-2222",
    pcd: false,
    ativo: true,
    criado_em: new Date("2025-02-03"),
  },
  {
    id: 3,
    nome_completo: "Pedro Oliveira",
    email: "pedro.oliveira@email.com",
    CPF: "39053344705",
    data_nascimento: "2001-11-02",
    telefone: "(61) 97777-3333",
    pcd: true,
    ativo: true,
    criado_em: new Date("2025-03-15"),
  },
];

const mockDocs = (idCandidatura: number): Documento[] => [
  {
    id: idCandidatura * 10 + 1,
    id_candidatura: idCandidatura,
    tipo_documento: "RG",
    nome_arquivo: "rg.pdf",
    status_documento: StatusDocumento.APROVADO,
    criado_em: new Date("2025-06-01"),
  },
  {
    id: idCandidatura * 10 + 2,
    id_candidatura: idCandidatura,
    tipo_documento: "Histórico Escolar",
    nome_arquivo: "historico.pdf",
    status_documento: StatusDocumento.EM_ANALISE,
    criado_em: new Date("2025-06-02"),
  },
  {
    id: idCandidatura * 10 + 3,
    id_candidatura: idCandidatura,
    tipo_documento: "Comprovante de Residência",
    nome_arquivo: "comprovante.pdf",
    status_documento: StatusDocumento.REVISAO_MANUAL,
    criado_em: new Date("2025-06-03"),
  },
];

const cursoCatalog = (id: number, nome: string): Cursos => ({
  id,
  nome,
  eixo_tecnologico: "Tecnologia da Informação",
  requisito_escolaridade: "Ensino Médio completo",
  area_conhecimento: nome,
});

const ofertaInfo = (
  id: number,
  idEdital: number,
  curso: Cursos,
  campusNome: string,
  turno: TurnoOferta,
  vagas: number,
): Oferta => ({
  id,
  id_edital: idEdital,
  id_curso: curso.id,
  id_campus: 1,
  turno,
  vagas_totais: vagas,
  curso,
  campus: { id: 1, nome: campusNome },
});

export const MOCK_INSCRICOES: AdminInscricao[] = [
  {
    id: 1,
    id_usuario: 1,
    id_oferta: 1,
    id_edital: 1,
    data_inscricao: "2025-06-10",
    status: StatusCandidatura.APROVADO,
    tipo_vaga: TipoVagaCandidatura.AC,
    protocolo: "001-C1-2025-00001-1",
    usuario: mockUsers[0],
    oferta: ofertaInfo(
      1,
      1,
      cursoCatalog(1, "Técnico em Informática"),
      "Brasília",
      TurnoOferta.NOTURNO,
      40,
    ),
    documentos: mockDocs(1),
    escola: "CED 01 de Brasília",
    ano_conclusao: "2024",
    necessidades_especiais: "Nenhuma",
    observacoes_admin: "",
  },
  {
    id: 2,
    id_usuario: 2,
    id_oferta: 2,
    id_edital: 1,
    data_inscricao: "2025-06-12",
    status: StatusCandidatura.ANALISE_DOCUMENTAL,
    tipo_vaga: TipoVagaCandidatura.PPI,
    protocolo: "001-C2-2025-00002-2",
    usuario: mockUsers[1],
    oferta: ofertaInfo(
      2,
      1,
      cursoCatalog(2, "Licenciatura em Matemática"),
      "Gama",
      TurnoOferta.INTEGRAL,
      35,
    ),
    documentos: mockDocs(2),
    escola: "CEM 02 do Gama",
    ano_conclusao: "2023",
    necessidades_especiais: "Nenhuma",
    observacoes_admin: "Aguardando verificação PPI.",
  },
  {
    id: 3,
    id_usuario: 3,
    id_oferta: 1,
    id_edital: 1,
    data_inscricao: "2025-06-14",
    status: StatusCandidatura.REPROVADO,
    tipo_vaga: TipoVagaCandidatura.PCD,
    protocolo: "001-C1-2025-00003-3",
    usuario: mockUsers[2],
    oferta: ofertaInfo(
      1,
      1,
      cursoCatalog(1, "Técnico em Informática"),
      "Brasília",
      TurnoOferta.NOTURNO,
      40,
    ),
    documentos: mockDocs(3),
    escola: "Escola Pública DF",
    ano_conclusao: "2022",
    necessidades_especiais: "PcD — laudo anexado",
    observacoes_admin: "Documentação incompleta.",
  },
  {
    id: 4,
    id_usuario: 1,
    id_oferta: 3,
    id_edital: 1,
    data_inscricao: "2025-07-01",
    status: StatusCandidatura.INSCRICAO_RECEBIDA,
    tipo_vaga: TipoVagaCandidatura.ESCOLA_PUBLICA,
    protocolo: "001-C3-2025-00004-1",
    usuario: mockUsers[0],
    oferta: ofertaInfo(
      3,
      1,
      cursoCatalog(3, "Técnico em Administração"),
      "Taguatinga",
      TurnoOferta.MATUTINO,
      30,
    ),
    documentos: mockDocs(4),
    escola: "CED Taguatinga Norte",
    ano_conclusao: "2024",
    necessidades_especiais: "Nenhuma",
  },
];

export const MOCK_CANDIDATOS: AdminCandidatoRow[] = mockUsers.map((u) => ({
  id: u.id,
  nome: u.nome_completo,
  email: u.email,
  status: "ativo",
  data_cadastro: u.criado_em
    ? new Date(u.criado_em).toISOString().slice(0, 10)
    : "2025-01-01",
  telefone: u.telefone,
}));

export const MOCK_MONTHLY = [
  { mes: "Jan", total: 82 },
  { mes: "Fev", total: 95 },
  { mes: "Mar", total: 110 },
  { mes: "Abr", total: 98 },
  { mes: "Mai", total: 124 },
  { mes: "Jun", total: 140 },
  { mes: "Jul", total: 132 },
];

export const MOCK_ATIVIDADE = [
  {
    id: 1,
    texto: "João Silva — Aprovado",
    quando: "há 2 horas",
    tone: "green" as const,
  },
  {
    id: 2,
    texto: "Maria Santos — Em Análise",
    quando: "há 4 horas",
    tone: "yellow" as const,
  },
  {
    id: 3,
    texto: "Pedro Oliveira — Rejeitado",
    quando: "ontem",
    tone: "red" as const,
  },
  {
    id: 4,
    texto: "Novo documento enviado — Histórico Escolar",
    quando: "ontem",
    tone: "blue" as const,
  },
];

export function getMockInscricao(id: number): AdminInscricao | undefined {
  return MOCK_INSCRICOES.find((i) => i.id === id);
}
