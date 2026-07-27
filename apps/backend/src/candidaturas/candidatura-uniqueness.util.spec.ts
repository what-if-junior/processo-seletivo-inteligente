import { StatusCandidatura } from '@repo/types';
import {
  canCandidateCancel,
  isBlockingTerminal,
  occupiesEditalSlot,
} from './candidatura-uniqueness.util';

describe('candidatura-uniqueness.util', () => {
  it('only cancelada frees the edital slot', () => {
    expect(occupiesEditalSlot(StatusCandidatura.CANCELADA)).toBe(false);
    expect(occupiesEditalSlot(StatusCandidatura.INSCRICAO_RECEBIDA)).toBe(true);
    expect(occupiesEditalSlot(StatusCandidatura.REPROVADO)).toBe(true);
    expect(occupiesEditalSlot(StatusCandidatura.DESCLASSIFICADA)).toBe(true);
  });

  it('marks reprovado/desclassificada as permanent blocks', () => {
    expect(isBlockingTerminal(StatusCandidatura.REPROVADO)).toBe(true);
    expect(isBlockingTerminal(StatusCandidatura.DESCLASSIFICADA)).toBe(true);
    expect(isBlockingTerminal(StatusCandidatura.CANCELADA)).toBe(false);
    expect(isBlockingTerminal(StatusCandidatura.INSCRICAO_RECEBIDA)).toBe(
      false,
    );
  });

  it('allows candidate cancel only for in-pipeline statuses', () => {
    expect(canCandidateCancel(StatusCandidatura.INSCRICAO_RECEBIDA)).toBe(true);
    expect(canCandidateCancel(StatusCandidatura.ANALISE_DOCUMENTAL)).toBe(true);
    expect(canCandidateCancel(StatusCandidatura.CANCELADA)).toBe(false);
    expect(canCandidateCancel(StatusCandidatura.REPROVADO)).toBe(false);
    expect(canCandidateCancel(StatusCandidatura.APROVADO)).toBe(false);
  });
});
