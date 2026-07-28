import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusCandidatura, TipoVagaCandidatura } from '@repo/types';
import { Candidatura } from './entities/candidatura.entity';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import { User } from '../user/entities/user.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Edital } from '../editais/entities/edital.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import {
  canCandidateCancel,
  isBlockingTerminal,
  MSG_ACTIVE_DUPLICATE,
  MSG_BLOCKED_AFTER_TERMINAL,
  MSG_CANCEL_NOT_ALLOWED,
  MSG_CANCEL_WINDOW_CLOSED,
  MSG_INSCRICAO_WINDOW_CLOSED,
  occupiesEditalSlot,
} from './candidatura-uniqueness.util';
import {
  cursoCodigoFromId,
  formatProtocolo,
  parseEditalNumeroAno,
} from './protocolo.util';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CandidaturasService {
  constructor(
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    private readonly cronogramaService: CronogramaService,
  ) {}

  async findAll(): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      relations: { usuario: true, oferta: { curso: true, campus: true } },
      order: { id: 'ASC' },
    });
  }

  async findByProtocolo(protocolo: string): Promise<Candidatura | null> {
    const normalized = protocolo.trim();
    if (!normalized) return null;
    return this.candidaturaRepository.findOne({
      where: { protocolo: normalized },
      relations: {
        usuario: true,
        oferta: { curso: true, campus: true, edital: true },
      },
    });
  }

  async findOne(id: number): Promise<Candidatura> {
    const candidatura = await this.candidaturaRepository.findOne({
      where: { id },
      relations: {
        usuario: true,
        oferta: { curso: true, campus: true, edital: true },
        documentos: true,
        etapas: { gestor: true, recursos: true },
      },
    });
    if (!candidatura)
      throw new NotFoundException(`Candidatura ${id} não encontrada`);
    return candidatura;
  }

  async findByOferta(idOferta: number): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      where: { id_oferta: idOferta },
      relations: { usuario: true },
      order: { id: 'ASC' },
    });
  }

  async findByUsuario(idUsuario: number): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      where: { id_usuario: idUsuario },
      relations: { oferta: { curso: true, campus: true } },
      order: { id: 'ASC' },
    });
  }

  private async assertJanelaInscricaoAberta(idEdital: number): Promise<void> {
    const janela = await this.cronogramaService.getJanelaInscricao(idEdital);
    if (!janela.aberta) {
      throw new ForbiddenException(MSG_INSCRICAO_WINDOW_CLOSED);
    }
  }

  private async assertJanelaCancelamentoAberta(
    idEdital: number,
  ): Promise<void> {
    const janela = await this.cronogramaService.getJanelaInscricao(idEdital);
    if (!janela.aberta) {
      throw new ForbiddenException(MSG_CANCEL_WINDOW_CLOSED);
    }
  }

  /**
   * REQ-2.2 / RS02: at most one non-cancelada inscription per usuario×edital.
   * `cancelada` frees the slot; `reprovado`/`desclassificada` block forever.
   */
  private async assertUnicidadeUsuarioEdital(
    idUsuario: number,
    idEdital: number,
  ): Promise<void> {
    const existentes = await this.candidaturaRepository.find({
      where: { id_usuario: idUsuario, id_edital: idEdital },
      order: { id: 'DESC' },
    });
    const ocupante = existentes.find((c) => occupiesEditalSlot(c.status));
    if (!ocupante) return;
    if (isBlockingTerminal(ocupante.status)) {
      throw new ConflictException(MSG_BLOCKED_AFTER_TERMINAL);
    }
    throw new ConflictException(MSG_ACTIVE_DUPLICATE);
  }

  /** Next SEQ for protocol within an edital (includes cancelled rows). */
  private async nextProtocoloSeq(idEdital: number): Promise<number> {
    const count = await this.candidaturaRepository.count({
      where: { id_edital: idEdital },
    });
    return count + 1;
  }

  private buildProtocoloForOferta(
    oferta: Oferta,
    idUsuario: number,
    seq: number,
  ): string {
    const numeroAno = oferta.edital?.numero_ano ?? String(oferta.id_edital);
    const { editalCodigo, ano } = parseEditalNumeroAno(numeroAno);
    const idCurso = oferta.id_curso ?? oferta.curso?.id ?? 0;
    return formatProtocolo({
      editalCodigo,
      cursoCodigo: cursoCodigoFromId(Number(idCurso)),
      ano,
      seq,
      idAluno: idUsuario,
    });
  }

  /** RS02: uma unica candidatura ativa por usuario em cada edital. */
  async create(dto: CreateCandidaturaDto): Promise<Candidatura> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id: dto.id_oferta },
      relations: { edital: true, curso: true },
    });
    if (!oferta) {
      throw new NotFoundException(`Oferta ${dto.id_oferta} não encontrada`);
    }

    const idEdital = oferta.id_edital;
    if (dto.id_edital != null && Number(dto.id_edital) !== Number(idEdital)) {
      throw new BadRequestException(
        `id_edital ${dto.id_edital} não corresponde à oferta ${dto.id_oferta}`,
      );
    }

    await this.assertJanelaInscricaoAberta(idEdital);
    await this.assertUnicidadeUsuarioEdital(dto.id_usuario, idEdital);

    const seq = await this.nextProtocoloSeq(idEdital);
    const protocolo = this.buildProtocoloForOferta(
      oferta,
      dto.id_usuario,
      seq,
    );

    const candidatura = this.candidaturaRepository.create({
      data_inscricao: dto.data_inscricao ?? new Date().toISOString().slice(0, 10),
      tipo_ingresso: dto.tipo_ingresso ?? null,
      tipo_vaga: dto.tipo_vaga ?? TipoVagaCandidatura.AC,
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      protocolo,
      usuario: { id: dto.id_usuario } as User,
      oferta: { id: dto.id_oferta } as Oferta,
      edital: { id: idEdital } as Edital,
    });

    try {
      return await this.candidaturaRepository.save(candidatura);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(MSG_ACTIVE_DUPLICATE);
      }
      throw error;
    }
  }

  /**
   * Candidate cancel → `cancelada` only while effective Inscrição window is open
   * (REQ-0.1 / 1.2 / 2.2).
   */
  async cancel(id: number): Promise<Candidatura> {
    const candidatura = await this.candidaturaRepository.findOne({
      where: { id },
    });
    if (!candidatura) {
      throw new NotFoundException(`Candidatura ${id} não encontrada`);
    }
    if (!canCandidateCancel(candidatura.status)) {
      throw new BadRequestException(MSG_CANCEL_NOT_ALLOWED);
    }

    await this.assertJanelaCancelamentoAberta(candidatura.id_edital);

    candidatura.status = StatusCandidatura.CANCELADA;
    return this.candidaturaRepository.save(candidatura);
  }
}
