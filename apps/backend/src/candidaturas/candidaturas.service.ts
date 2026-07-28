import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusCandidatura, TipoVagaCandidatura } from '@repo/types';
import { Candidatura } from './entities/candidatura.entity';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import { User } from '../user/entities/user.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { CronogramaService } from '../cronograma/cronograma.service';
import { SocioeconomicoService } from '../socioeconomico/socioeconomico.service';
import { UpdateTipoVagaDto } from '../socioeconomico/dto/socioeconomico.dto';
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
import {
  cursoCodigoFromId,
  formatProtocolo,
  parseEditalNumeroAno,
} from './protocolo.util';
import {
  buildComprovantePdf,
  buildProtocoloValidateUrl,
} from './comprovante-pdf.util';

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
    private readonly socioeconomicoService: SocioeconomicoService,
    private readonly configService: ConfigService,
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

  async findOne(id: number): Promise<
    Candidatura & {
      socioeconomico?: Awaited<
        ReturnType<SocioeconomicoService['findByCandidatura']>
      >;
    }
  > {
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
    const socioeconomico =
      await this.socioeconomicoService.findByCandidatura(id);
    return Object.assign(candidatura, { socioeconomico });
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

  async create(dto: CreateCandidaturaDto): Promise<
    Candidatura & {
      socioeconomico?: Awaited<
        ReturnType<SocioeconomicoService['findByCandidatura']>
      >;
    }
  > {
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

    const tipoVaga = dto.tipo_vaga ?? TipoVagaCandidatura.AC;
    const dataInscricao =
      dto.data_inscricao ?? new Date().toISOString().slice(0, 10);
    const menorFields = await this.resolveMenorResponsavel(dto, dataInscricao);
    const seq = await this.nextProtocoloSeq(idEdital);
    const protocolo = this.buildProtocoloForOferta(
      oferta,
      dto.id_usuario,
      seq,
    );
    const tipoIngresso = dto.tipo_ingresso ?? null;

    let savedId: number;
    try {
      // FK scalars are insert:false on the entity; insert via SQL so JoinColumns
      // and protocolo/menor fields are always written.
      const rows: Array<{ id: number }> = await this.candidaturaRepository.query(
        `INSERT INTO "Candidaturas"
          ("id_usuario", "id_oferta", "id_edital", "data_inscricao", "status",
           "tipo_ingresso", "tipo_vaga", "protocolo",
           "menor_idade", "responsavel_nome", "responsavel_cpf",
           "responsavel_aceite", "responsavel_documento_nome", "responsavel_documento")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          dto.id_usuario,
          dto.id_oferta,
          idEdital,
          dataInscricao,
          StatusCandidatura.INSCRICAO_RECEBIDA,
          tipoIngresso,
          tipoVaga,
          protocolo,
          menorFields.menor_idade,
          menorFields.responsavel_nome,
          menorFields.responsavel_cpf,
          menorFields.responsavel_aceite,
          menorFields.responsavel_documento_nome,
          menorFields.responsavel_documento,
        ],
      );
      savedId = Number(rows[0].id);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(MSG_ACTIVE_DUPLICATE);
      }
      throw error;
    }

    const saved = await this.candidaturaRepository.findOne({
      where: { id: savedId },
    });
    if (!saved) {
      throw new NotFoundException(`Candidatura ${savedId} não encontrada`);
    }

    await this.socioeconomicoService.applyForCandidatura(
      saved,
      tipoVaga,
      dto.socioeconomico,
    );

    return this.findOne(savedId);
  }

  /** REQ-2.3: change cota — previous socio answers stay archived. */
  async updateTipoVaga(
    id: number,
    dto: UpdateTipoVagaDto,
  ): Promise<
    Candidatura & {
      socioeconomico?: Awaited<
        ReturnType<SocioeconomicoService['findByCandidatura']>
      >;
    }
  > {
    const candidatura = await this.candidaturaRepository.findOne({
      where: { id },
    });
    if (!candidatura) {
      throw new NotFoundException(`Candidatura ${id} não encontrada`);
    }
    if (!dto.tipo_vaga) {
      throw new BadRequestException('tipo_vaga é obrigatório');
    }

    await this.assertJanelaInscricaoAberta(candidatura.id_edital);

    candidatura.tipo_vaga = dto.tipo_vaga;
    const saved = await this.candidaturaRepository.save(candidatura);

    await this.socioeconomicoService.applyForCandidatura(
      saved,
      dto.tipo_vaga,
      dto.socioeconomico,
      { archivePrevious: true },
    );

    const socioeconomico =
      await this.socioeconomicoService.findByCandidatura(saved.id);
    return Object.assign(saved, { socioeconomico });
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
   * (REQ-0.1 / 1.2 / 2.2). Protocol string is kept; QR validation fails (REQ-2.5).
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

  /** REQ-2.5: on-demand comprovante PDF with validation QR. */
  async getComprovantePdf(id: number): Promise<{
    buffer: Buffer;
    protocolo: string;
    filename: string;
  }> {
    const candidatura = await this.findOne(id);
    if (!candidatura.protocolo) {
      throw new BadRequestException(
        'Candidatura sem protocolo; não é possível emitir comprovante',
      );
    }

    const publicBase =
      this.configService.get<string>('PUBLIC_API_URL') ??
      this.configService.get<string>('API_PUBLIC_URL') ??
      `http://localhost:${this.configService.get('PORT') ?? 5005}`;

    const validateUrl = buildProtocoloValidateUrl(
      publicBase,
      candidatura.protocolo,
    );

    const buffer = await buildComprovantePdf({
      protocolo: candidatura.protocolo,
      validateUrl,
      candidato:
        candidatura.usuario?.nome_completo ?? `Usuário #${candidatura.id_usuario}`,
      curso:
        candidatura.oferta?.curso?.nome ?? `Oferta #${candidatura.id_oferta}`,
      campus: candidatura.oferta?.campus?.nome ?? '—',
      dataInscricao: candidatura.data_inscricao,
      status: candidatura.status,
    });

    return {
      buffer,
      protocolo: candidatura.protocolo,
      filename: `comprovante-${candidatura.protocolo}.pdf`,
    };
  }
}
