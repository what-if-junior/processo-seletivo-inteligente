import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { StatusCandidatura, TipoVagaCandidatura } from '@repo/types';
import { User } from '../user/entities/user.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import {
  assertEncoding,
  mapRows,
  parseColumnMap,
  parseLoteFile,
  type LoteFile,
  type LoteRow,
} from './lote-parse.util';
import {
  CONTA_CAMPOS,
  INSCRICAO_CAMPOS,
  dryRunContas,
  dryRunInscricoes,
  onlyDigits,
  type ContasContext,
  type DryRunResult,
  type InscricoesContext,
  type OfertaRef,
} from './lote-dry-run.util';

export type LoteOptions = {
  encoding?: string | null;
  columnMap?: string | null;
};

export type CommitResult = {
  dryRun: DryRunResult;
  criados: number;
  ignorados: number;
};

/**
 * W20 / W21 — importação em lote de contas e inscrições (REQ-2.8).
 *
 * O commit repete o dry-run com os dados frescos do banco: o wizard mostra a
 * pré-visualização, mas só o que continua válido no momento da gravação entra.
 */
@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
  ) {}

  private readRows(
    file: LoteFile | undefined,
    options: LoteOptions,
    campos: readonly string[],
  ): LoteRow[] {
    const encoding = assertEncoding(options.encoding);
    const sheet = parseLoteFile(file, encoding);
    return mapRows(sheet, parseColumnMap(options.columnMap), campos);
  }

  private async buildContasContext(rows: LoteRow[]): Promise<ContasContext> {
    const cpfs = rows
      .map((row) => onlyDigits(row.dados.cpf))
      .filter((cpf) => cpf.length === 11);
    const emails = rows
      .map((row) => (row.dados.email || '').trim().toLowerCase())
      .filter(Boolean);

    const existentes = await this.userRepository.find({
      select: { id: true, email: true, CPF: true },
    });

    return {
      cpfsExistentes: new Set(
        existentes
          .map((user) => onlyDigits(user.CPF))
          .filter((cpf) => cpfs.includes(cpf)),
      ),
      emailsExistentes: new Set(
        existentes
          .map((user) => (user.email || '').toLowerCase())
          .filter((email) => emails.includes(email)),
      ),
    };
  }

  async dryRunContas(
    file: LoteFile | undefined,
    options: LoteOptions,
  ): Promise<DryRunResult> {
    const rows = this.readRows(file, options, CONTA_CAMPOS);
    const ctx = await this.buildContasContext(rows);
    return dryRunContas(rows, ctx).resultado;
  }

  async commitContas(
    file: LoteFile | undefined,
    options: LoteOptions,
  ): Promise<CommitResult> {
    const rows = this.readRows(file, options, CONTA_CAMPOS);
    const ctx = await this.buildContasContext(rows);
    const { resultado, planejadas } = dryRunContas(rows, ctx);

    for (const conta of planejadas) {
      // Sem senha na planilha, gera-se uma provisória: o acesso passa então
      // pela recuperação de senha, sem deixar a conta com segredo previsível.
      const senha = conta.senha || randomBytes(12).toString('base64url');
      const user = this.userRepository.create({
        nome_completo: conta.nome_completo,
        email: conta.email,
        senha: await bcrypt.hash(senha, 10),
        CPF: conta.cpf,
        data_nascimento: conta.data_nascimento,
        telefone: conta.telefone,
        pcd: false,
        ativo: true,
      });
      await this.userRepository.save(user);
    }

    return {
      dryRun: resultado,
      criados: planejadas.length,
      ignorados: resultado.total - planejadas.length,
    };
  }

  private async buildInscricoesContext(
    rows: LoteRow[],
  ): Promise<InscricoesContext> {
    const cpfs = new Set(
      rows
        .map((row) => onlyDigits(row.dados.cpf))
        .filter((cpf) => cpf.length === 11),
    );
    const idsOferta = [
      ...new Set(
        rows
          .map((row) => Number(row.dados.id_oferta))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    const usuarios = await this.userRepository.find({
      select: { id: true, CPF: true },
    });
    const usuarioIdPorCpf = new Map<string, number>();
    for (const usuario of usuarios) {
      const cpf = onlyDigits(usuario.CPF);
      if (cpfs.has(cpf)) usuarioIdPorCpf.set(cpf, usuario.id);
    }

    const ofertas = idsOferta.length
      ? await this.ofertaRepository.find({ where: { id: In(idsOferta) } })
      : [];
    const ofertasPorId = new Map<number, OfertaRef>(
      ofertas.map((oferta) => [
        oferta.id,
        { id: oferta.id, id_edital: Number(oferta.id_edital) },
      ]),
    );

    const idsUsuario = [...usuarioIdPorCpf.values()];
    const candidaturasExistentes = idsUsuario.length
      ? await this.candidaturaRepository.find({
          where: { id_usuario: In(idsUsuario) },
          select: {
            id: true,
            id_usuario: true,
            id_edital: true,
            status: true,
            tipo_ingresso: true,
          },
        })
      : [];

    return { usuarioIdPorCpf, ofertasPorId, candidaturasExistentes };
  }

  async dryRunInscricoes(
    file: LoteFile | undefined,
    options: LoteOptions,
  ): Promise<DryRunResult> {
    const rows = this.readRows(file, options, INSCRICAO_CAMPOS);
    const ctx = await this.buildInscricoesContext(rows);
    return dryRunInscricoes(rows, ctx).resultado;
  }

  /**
   * REQ-2.2: o caminho SiSU não passa pela unicidade do PWA — as candidaturas
   * são criadas diretamente, sem `CandidaturasService`.
   */
  async commitInscricoes(
    file: LoteFile | undefined,
    options: LoteOptions,
  ): Promise<CommitResult> {
    const rows = this.readRows(file, options, INSCRICAO_CAMPOS);
    const ctx = await this.buildInscricoesContext(rows);
    const { resultado, planejadas } = dryRunInscricoes(rows, ctx);

    const candidaturas = planejadas.map((inscricao) =>
      this.candidaturaRepository.create({
        data_inscricao: inscricao.data_inscricao,
        status: StatusCandidatura.INSCRICAO_RECEBIDA,
        tipo_ingresso: inscricao.tipo_ingresso,
        tipo_vaga:
          (inscricao.tipo_vaga as TipoVagaCandidatura) ??
          TipoVagaCandidatura.AC,
        usuario: { id: inscricao.id_usuario } as User,
        oferta: { id: inscricao.id_oferta } as Oferta,
        edital: { id: inscricao.id_edital } as Edital,
      }),
    );

    if (candidaturas.length) {
      await this.candidaturaRepository.save(candidaturas);
    }

    return {
      dryRun: resultado,
      criados: candidaturas.length,
      ignorados: resultado.total - candidaturas.length,
    };
  }
}
