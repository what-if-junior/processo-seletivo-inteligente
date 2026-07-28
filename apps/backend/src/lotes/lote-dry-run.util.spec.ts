import { StatusCandidatura, TipoIngresso } from '@repo/types';
import {
  dryRunContas,
  dryRunInscricoes,
  isValidCpf,
  normalizeDate,
  type ContasContext,
  type InscricoesContext,
} from './lote-dry-run.util';
import type { LoteRow } from './lote-parse.util';

const CPF_A = '52998224725';
const CPF_B = '11144477735';

const contaRow = (
  linha: number,
  dados: Partial<Record<string, string>>,
): LoteRow => ({
  linha,
  dados: {
    nome_completo: 'Maria Silva',
    email: `maria${linha}@teste.com`,
    cpf: CPF_A,
    data_nascimento: '2001-05-10',
    telefone: '11999990000',
    senha: '',
    ...dados,
  } as Record<string, string>,
});

const inscricaoRow = (
  linha: number,
  dados: Partial<Record<string, string>>,
): LoteRow => ({
  linha,
  dados: {
    cpf: CPF_A,
    id_oferta: '10',
    tipo_vaga: 'AC',
    tipo_ingresso: '',
    data_inscricao: '2025-03-01',
    ...dados,
  } as Record<string, string>,
});

describe('lote-dry-run helpers', () => {
  it('valida os dígitos verificadores do CPF', () => {
    expect(isValidCpf(CPF_A)).toBe(true);
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('normaliza datas ISO e brasileiras', () => {
    expect(normalizeDate('2001-05-10')).toBe('2001-05-10');
    expect(normalizeDate('10/05/2001')).toBe('2001-05-10');
    expect(normalizeDate('ontem')).toBeNull();
  });
});

describe('dryRunContas (W20 / REQ-2.8)', () => {
  const ctxVazio = (): ContasContext => ({
    cpfsExistentes: new Set<string>(),
    emailsExistentes: new Set<string>(),
  });

  it('aceita a linha completa e planeia a criação', () => {
    const { resultado, planejadas } = dryRunContas(
      [contaRow(2, {})],
      ctxVazio(),
    );

    expect(resultado).toMatchObject({ total: 1, validos: 1, erros: 0 });
    expect(resultado.linhas[0].status).toBe('ok');
    expect(planejadas).toHaveLength(1);
    expect(planejadas[0]).toMatchObject({ cpf: CPF_A, linha: 2 });
  });

  it('bloqueia campos obrigatórios em falta e CPF inválido', () => {
    const { resultado, planejadas } = dryRunContas(
      [
        contaRow(2, {
          nome_completo: '',
          cpf: '12345678900',
          data_nascimento: 'ontem',
        }),
      ],
      ctxVazio(),
    );

    expect(resultado.erros).toBe(1);
    expect(planejadas).toHaveLength(0);
    expect(resultado.linhas[0].issues.map((i) => i.campo)).toEqual(
      expect.arrayContaining(['nome_completo', 'cpf', 'data_nascimento']),
    );
  });

  it('bloqueia o CPF repetido dentro do próprio ficheiro', () => {
    const { resultado, planejadas } = dryRunContas(
      [contaRow(2, {}), contaRow(3, {})],
      ctxVazio(),
    );

    expect(resultado.erros).toBe(1);
    expect(planejadas).toHaveLength(1);
    expect(resultado.linhas[1].issues[0].mensagem).toMatch(/repetido/i);
  });

  it('avisa (sem bloquear) quando a conta já existe no banco', () => {
    const { resultado, planejadas } = dryRunContas([contaRow(2, {})], {
      cpfsExistentes: new Set([CPF_A]),
      emailsExistentes: new Set<string>(),
    });

    expect(resultado).toMatchObject({ erros: 0, validos: 1, avisos: 1 });
    expect(resultado.linhas[0].status).toBe('aviso');
    expect(planejadas).toHaveLength(0);
  });
});

describe('dryRunInscricoes (W21 / REQ-2.2)', () => {
  const baseCtx = (
    candidaturas: InscricoesContext['candidaturasExistentes'] = [],
  ): InscricoesContext => ({
    usuarioIdPorCpf: new Map([
      [CPF_A, 7],
      [CPF_B, 8],
    ]),
    ofertasPorId: new Map([[10, { id: 10, id_edital: 3 }]]),
    candidaturasExistentes: candidaturas,
  });

  it('planeia a inscrição válida', () => {
    const { resultado, planejadas } = dryRunInscricoes(
      [inscricaoRow(2, {})],
      baseCtx(),
    );

    expect(resultado).toMatchObject({ total: 1, validos: 1, erros: 0 });
    expect(planejadas[0]).toMatchObject({
      id_usuario: 7,
      id_oferta: 10,
      id_edital: 3,
      tipo_vaga: 'AC',
    });
  });

  it('bloqueia CPF sem conta e oferta inexistente', () => {
    const { resultado, planejadas } = dryRunInscricoes(
      [
        inscricaoRow(2, { cpf: '98765432100' }),
        inscricaoRow(3, { id_oferta: '999' }),
      ],
      baseCtx(),
    );

    expect(resultado.erros).toBe(2);
    expect(planejadas).toHaveLength(0);
  });

  it('bloqueia a segunda inscrição do candidato no mesmo edital', () => {
    const { resultado, planejadas } = dryRunInscricoes(
      [inscricaoRow(2, {}), inscricaoRow(3, {})],
      baseCtx(),
    );

    expect(resultado.erros).toBe(1);
    expect(planejadas).toHaveLength(1);
    expect(resultado.linhas[1].issues[0].mensagem).toMatch(/inscrição ativa/i);
  });

  it('deixa a linha SiSU passar com aviso quando já há inscrição do PWA', () => {
    const { resultado, planejadas } = dryRunInscricoes(
      [inscricaoRow(2, { tipo_ingresso: 'sisu' })],
      baseCtx([
        {
          id_usuario: 7,
          id_edital: 3,
          status: StatusCandidatura.INSCRICAO_RECEBIDA,
          tipo_ingresso: null,
        },
      ]),
    );

    expect(resultado).toMatchObject({ erros: 0, validos: 1, avisos: 1 });
    expect(resultado.linhas[0].status).toBe('aviso');
    expect(planejadas[0]).toMatchObject({
      id_usuario: 7,
      tipo_ingresso: TipoIngresso.SISU,
    });
  });

  it('não conta a candidatura cancelada como ocupante da vaga', () => {
    const { resultado } = dryRunInscricoes(
      [inscricaoRow(2, {})],
      baseCtx([
        {
          id_usuario: 7,
          id_edital: 3,
          status: StatusCandidatura.CANCELADA,
          tipo_ingresso: null,
        },
      ]),
    );

    expect(resultado.erros).toBe(0);
  });

  it('rejeita tipo_ingresso fora do enum', () => {
    const { resultado } = dryRunInscricoes(
      [inscricaoRow(2, { tipo_ingresso: 'vestibular' })],
      baseCtx(),
    );

    expect(resultado.erros).toBe(1);
    expect(resultado.linhas[0].issues[0].campo).toBe('tipo_ingresso');
  });
});
