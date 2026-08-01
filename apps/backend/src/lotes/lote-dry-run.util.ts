import { StatusCandidatura, TipoIngresso } from '@repo/types';
import type { LoteRow } from './lote-parse.util';

/**
 * W20 / W21 — validação prévia dos lotes (REQ-2.8 e REQ-2.2).
 *
 * O commit só corre depois do dry-run, portanto toda a regra de negócio vive
 * aqui, sem tocar no banco: o serviço injeta o contexto já carregado.
 *
 * Erro bloqueia a linha; aviso deixa passar (o SiSU convive com a inscrição do
 * PWA porque não passa pela unicidade — ver o índice parcial em
 * `database/15_w20_w25_classificacao.sql`).
 */

export const CONTA_CAMPOS = [
  'nome_completo',
  'email',
  'cpf',
  'data_nascimento',
  'telefone',
  'senha',
] as const;

export const INSCRICAO_CAMPOS = [
  'cpf',
  'id_oferta',
  'tipo_vaga',
  'tipo_ingresso',
  'data_inscricao',
] as const;

export type Severidade = 'erro' | 'aviso';

export type LoteIssue = {
  campo?: string;
  severidade: Severidade;
  mensagem: string;
};

export type DryRunLinha = {
  linha: number;
  dados: Record<string, string>;
  status: 'ok' | 'aviso' | 'erro';
  issues: LoteIssue[];
};

export type DryRunResult = {
  total: number;
  validos: number;
  avisos: number;
  erros: number;
  linhas: DryRunLinha[];
};

export type ContaPlanejada = {
  linha: number;
  nome_completo: string;
  email: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  senha?: string;
};

export type ContasContext = {
  cpfsExistentes: Set<string>;
  emailsExistentes: Set<string>;
};

export type OfertaRef = {
  id: number;
  id_edital: number;
};

export type CandidaturaExistente = {
  id_usuario: number;
  id_edital: number;
  status: StatusCandidatura | string;
  tipo_ingresso?: TipoIngresso | string | null;
};

export type InscricoesContext = {
  usuarioIdPorCpf: Map<string, number>;
  ofertasPorId: Map<number, OfertaRef>;
  candidaturasExistentes: CandidaturaExistente[];
};

export type InscricaoPlanejada = {
  linha: number;
  id_usuario: number;
  id_oferta: number;
  id_edital: number;
  tipo_vaga: string;
  tipo_ingresso: TipoIngresso | null;
  data_inscricao: string;
};

export function onlyDigits(valor?: string | null): string {
  return (valor || '').replace(/\D/g, '');
}

/** Validação padrão de CPF (dois dígitos verificadores). */
export function isValidCpf(valor?: string | null): boolean {
  const cpf = onlyDigits(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(cpf[i]) * (ate + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/** Aceita `YYYY-MM-DD` e `DD/MM/YYYY`; devolve sempre ISO ou `null`. */
export function normalizeDate(valor?: string | null): string | null {
  const texto = (valor || '').trim();
  if (!texto) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(texto);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return null;
}

function emptyResult(): DryRunResult {
  return { total: 0, validos: 0, avisos: 0, erros: 0, linhas: [] };
}

function registrarLinha(
  resultado: DryRunResult,
  row: LoteRow,
  issues: LoteIssue[],
): boolean {
  const temErro = issues.some((issue) => issue.severidade === 'erro');
  const temAviso = issues.some((issue) => issue.severidade === 'aviso');

  resultado.total += 1;
  if (temErro) resultado.erros += 1;
  else {
    resultado.validos += 1;
    if (temAviso) resultado.avisos += 1;
  }

  resultado.linhas.push({
    linha: row.linha,
    dados: row.dados,
    status: temErro ? 'erro' : temAviso ? 'aviso' : 'ok',
    issues,
  });

  return !temErro;
}

/** W20 — lote de contas: valida e antecipa duplicados dentro e fora do ficheiro. */
export function dryRunContas(
  rows: LoteRow[],
  ctx: ContasContext,
): { resultado: DryRunResult; planejadas: ContaPlanejada[] } {
  const resultado = emptyResult();
  const planejadas: ContaPlanejada[] = [];
  const cpfsNoFicheiro = new Set<string>();
  const emailsNoFicheiro = new Set<string>();

  for (const row of rows) {
    const issues: LoteIssue[] = [];
    const nome = row.dados.nome_completo?.trim() ?? '';
    const email = row.dados.email?.trim().toLowerCase() ?? '';
    const cpf = onlyDigits(row.dados.cpf);
    const nascimento = normalizeDate(row.dados.data_nascimento);
    const telefone = row.dados.telefone?.trim() ?? '';
    const senha = row.dados.senha?.trim() || undefined;

    if (!nome) {
      issues.push({
        campo: 'nome_completo',
        severidade: 'erro',
        mensagem: 'Nome completo é obrigatório',
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push({
        campo: 'email',
        severidade: 'erro',
        mensagem: 'E-mail inválido',
      });
    }
    if (!isValidCpf(cpf)) {
      issues.push({ campo: 'cpf', severidade: 'erro', mensagem: 'CPF inválido' });
    }
    if (!nascimento) {
      issues.push({
        campo: 'data_nascimento',
        severidade: 'erro',
        mensagem: 'Data de nascimento inválida (use YYYY-MM-DD ou DD/MM/AAAA)',
      });
    }

    if (cpf && cpfsNoFicheiro.has(cpf)) {
      issues.push({
        campo: 'cpf',
        severidade: 'erro',
        mensagem: 'CPF repetido no ficheiro',
      });
    }
    if (email && emailsNoFicheiro.has(email)) {
      issues.push({
        campo: 'email',
        severidade: 'erro',
        mensagem: 'E-mail repetido no ficheiro',
      });
    }

    // Conta já existente não é erro: o lote apenas a ignora no commit.
    if (cpf && ctx.cpfsExistentes.has(cpf)) {
      issues.push({
        campo: 'cpf',
        severidade: 'aviso',
        mensagem: 'Já existe conta com este CPF; a linha será ignorada',
      });
    }
    if (email && ctx.emailsExistentes.has(email)) {
      issues.push({
        campo: 'email',
        severidade: 'aviso',
        mensagem: 'Já existe conta com este e-mail; a linha será ignorada',
      });
    }

    const aproveitavel = registrarLinha(resultado, row, issues);
    if (cpf) cpfsNoFicheiro.add(cpf);
    if (email) emailsNoFicheiro.add(email);

    const jaExiste =
      (cpf && ctx.cpfsExistentes.has(cpf)) ||
      (email && ctx.emailsExistentes.has(email));

    if (aproveitavel && !jaExiste) {
      planejadas.push({
        linha: row.linha,
        nome_completo: nome,
        email,
        cpf,
        data_nascimento: nascimento!,
        telefone,
        senha,
      });
    }
  }

  return { resultado, planejadas };
}

function ocupaVagaNoEdital(status: StatusCandidatura | string): boolean {
  return status !== StatusCandidatura.CANCELADA;
}

/**
 * W21 — lote de inscrições. A importação SiSU não passa pela unicidade do PWA
 * (REQ-2.2): duplicidade vira aviso e a candidatura é criada à mesma.
 */
export function dryRunInscricoes(
  rows: LoteRow[],
  ctx: InscricoesContext,
): { resultado: DryRunResult; planejadas: InscricaoPlanejada[] } {
  const resultado = emptyResult();
  const planejadas: InscricaoPlanejada[] = [];
  const ocupadosNoFicheiro = new Set<string>();

  const ocupadosNoBanco = new Set(
    ctx.candidaturasExistentes
      .filter(
        (candidatura) =>
          ocupaVagaNoEdital(candidatura.status) &&
          (candidatura.tipo_ingresso ?? '') !== TipoIngresso.SISU,
      )
      .map((candidatura) => `${candidatura.id_usuario}:${candidatura.id_edital}`),
  );

  for (const row of rows) {
    const issues: LoteIssue[] = [];
    const cpf = onlyDigits(row.dados.cpf);
    const idOferta = Number(row.dados.id_oferta);
    const tipoVaga = (row.dados.tipo_vaga || 'AC').trim().toUpperCase();
    const tipoIngressoBruto = (row.dados.tipo_ingresso || '').trim().toLowerCase();
    const dataInscricao =
      normalizeDate(row.dados.data_inscricao) ??
      new Date().toISOString().slice(0, 10);

    if (!isValidCpf(cpf)) {
      issues.push({ campo: 'cpf', severidade: 'erro', mensagem: 'CPF inválido' });
    }

    const idUsuario = ctx.usuarioIdPorCpf.get(cpf);
    if (isValidCpf(cpf) && idUsuario == null) {
      issues.push({
        campo: 'cpf',
        severidade: 'erro',
        mensagem: 'Nenhuma conta encontrada para este CPF; importe as contas primeiro',
      });
    }

    const oferta = Number.isFinite(idOferta)
      ? ctx.ofertasPorId.get(idOferta)
      : undefined;
    if (!oferta) {
      issues.push({
        campo: 'id_oferta',
        severidade: 'erro',
        mensagem: `Oferta ${row.dados.id_oferta || '(vazia)'} não encontrada`,
      });
    }

    const tipoIngresso = tipoIngressoBruto
      ? (Object.values(TipoIngresso) as string[]).includes(tipoIngressoBruto)
        ? (tipoIngressoBruto as TipoIngresso)
        : null
      : null;
    if (tipoIngressoBruto && !tipoIngresso) {
      issues.push({
        campo: 'tipo_ingresso',
        severidade: 'erro',
        mensagem: `tipo_ingresso inválido: ${tipoIngressoBruto}`,
      });
    }

    const ehSisu = tipoIngresso === TipoIngresso.SISU;

    if (idUsuario != null && oferta) {
      const chave = `${idUsuario}:${oferta.id_edital}`;
      const duplicado =
        ocupadosNoBanco.has(chave) || ocupadosNoFicheiro.has(chave);

      if (duplicado && ehSisu) {
        issues.push({
          severidade: 'aviso',
          mensagem:
            'Candidato já inscrito neste edital pelo PWA; a linha SiSU será criada em paralelo',
        });
      } else if (duplicado) {
        issues.push({
          severidade: 'erro',
          mensagem: 'Candidato já possui inscrição ativa neste edital',
        });
      }
    }

    const aproveitavel = registrarLinha(resultado, row, issues);

    if (aproveitavel && idUsuario != null && oferta) {
      if (!ehSisu) ocupadosNoFicheiro.add(`${idUsuario}:${oferta.id_edital}`);
      planejadas.push({
        linha: row.linha,
        id_usuario: idUsuario,
        id_oferta: oferta.id,
        id_edital: oferta.id_edital,
        tipo_vaga: tipoVaga,
        tipo_ingresso: tipoIngresso,
        data_inscricao: dataInscricao,
      });
    }
  }

  return { resultado, planejadas };
}
