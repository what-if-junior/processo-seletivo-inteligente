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

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CandidaturasService {
  constructor(
    @InjectRepository(Candidatura)
    private readonly candidaturaRepository: Repository<Candidatura>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    private readonly cronogramaService: CronogramaService,
    private readonly socioeconomicoService: SocioeconomicoService,
  ) {}

  async findAll(): Promise<Candidatura[]> {
    return this.candidaturaRepository.find({
      relations: { usuario: true, oferta: { curso: true, campus: true } },
      order: { id: 'ASC' },
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

  async create(dto: CreateCandidaturaDto): Promise<
    Candidatura & {
      socioeconomico?: Awaited<
        ReturnType<SocioeconomicoService['findByCandidatura']>
      >;
    }
  > {
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

    const tipoVaga = dto.tipo_vaga ?? TipoVagaCandidatura.AC;

    const candidatura = this.candidaturaRepository.create({
      data_inscricao:
        dto.data_inscricao ?? new Date().toISOString().slice(0, 10),
      tipo_ingresso: dto.tipo_ingresso ?? null,
      tipo_vaga: tipoVaga,
      status: StatusCandidatura.INSCRICAO_RECEBIDA,
      usuario: { id: dto.id_usuario } as User,
      oferta: { id: dto.id_oferta } as Oferta,
      edital: { id: idEdital } as Edital,
    });

    let saved: Candidatura;
    try {
      saved = await this.candidaturaRepository.save(candidatura);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(MSG_ACTIVE_DUPLICATE);
      }
      throw error;
    }

    await this.socioeconomicoService.applyForCandidatura(
      saved,
      tipoVaga,
      dto.socioeconomico,
    );

    const socioeconomico =
      await this.socioeconomicoService.findByCandidatura(saved.id);
    return Object.assign(saved, { socioeconomico });
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
