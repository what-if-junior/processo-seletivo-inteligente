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
  decodeDocumentoBase64,
  isMenorNaData,
  MSG_MENOR_RESPONSAVEL_OBRIGATORIO,
  MSG_MENOR_SEM_NASCIMENTO,
} from './menoridade.util';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CandidaturasService {
  constructor(
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cronogramaService: CronogramaService,
  ) {}

  async findAll(): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      relations: { usuario: true, oferta: { curso: true, campus: true } },
      order: { id: 'ASC' },
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

  /** RS02 / REQ-2.4: unicidade + menoridade na data do submit. */
  async create(dto: CreateCandidaturaDto): Promise<Candidatura> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id: dto.id_oferta },
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

    const dataInscricao =
      dto.data_inscricao ?? new Date().toISOString().slice(0, 10);
    const menorFields = await this.resolveMenorResponsavel(dto, dataInscricao);

    const candidatura = this.candidaturaRepository.create({
      data_inscricao: dataInscricao,
      tipo_ingresso: dto.tipo_ingresso ?? null,
      tipo_vaga: dto.tipo_vaga ?? TipoVagaCandidatura.AC,
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      usuario: { id: dto.id_usuario } as User,
      oferta: { id: dto.id_oferta } as Oferta,
      edital: { id: idEdital } as Edital,
      ...menorFields,
    });

    try {
      const saved = await this.candidaturaRepository.save(candidatura);
      delete (saved as Candidatura & { responsavel_documento?: Buffer })
        .responsavel_documento;
      return saved;
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(MSG_ACTIVE_DUPLICATE);
      }
      throw error;
    }
  }

  /**
   * REQ-2.4: age at submit date from Usuarios.data_nascimento.
   * Adults ignore responsável payload; minors must supply nome+CPF+aceite+doc.
   */
  private async resolveMenorResponsavel(
    dto: CreateCandidaturaDto,
    dataInscricao: string,
  ): Promise<{
    menor_idade: boolean;
    responsavel_nome: string | null;
    responsavel_cpf: string | null;
    responsavel_aceite: boolean;
    responsavel_documento_nome: string | null;
    responsavel_documento: Buffer | null;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: dto.id_usuario },
    });
    if (!user) {
      throw new NotFoundException(`Usuário ${dto.id_usuario} não encontrado`);
    }
    if (!user.data_nascimento) {
      throw new BadRequestException(MSG_MENOR_SEM_NASCIMENTO);
    }

    let menor: boolean;
    try {
      menor = isMenorNaData(user.data_nascimento, dataInscricao);
    } catch {
      throw new BadRequestException(MSG_MENOR_SEM_NASCIMENTO);
    }

    if (!menor) {
      return {
        menor_idade: false,
        responsavel_nome: null,
        responsavel_cpf: null,
        responsavel_aceite: false,
        responsavel_documento_nome: null,
        responsavel_documento: null,
      };
    }

    const nome = dto.responsavel_nome?.trim() ?? '';
    const cpfDigits = (dto.responsavel_cpf ?? '').replace(/\D/g, '');
    const aceite = dto.responsavel_aceite === true;
    const doc = decodeDocumentoBase64(dto.responsavel_documento_base64);
    const docNome = dto.responsavel_documento_nome?.trim() ?? '';

    if (!nome || cpfDigits.length < 11 || !aceite || !doc || !docNome) {
      throw new BadRequestException(MSG_MENOR_RESPONSAVEL_OBRIGATORIO);
    }

    return {
      menor_idade: true,
      responsavel_nome: nome,
      responsavel_cpf: cpfDigits.slice(0, 14),
      responsavel_aceite: true,
      responsavel_documento_nome: docNome,
      responsavel_documento: doc,
    };
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
