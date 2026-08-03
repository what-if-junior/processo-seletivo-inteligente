import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TipoCarrossel } from '@repo/types';
import { CarrosselItem } from './entities/carrossel-item.entity';
import { Edital } from '../editais/entities/edital.entity';
import { CreateCarrosselManualDto } from './dto/create-carrossel-manual.dto';
import { UpdateCarrosselItemDto } from './dto/update-carrossel-item.dto';
import { buildAutoEditalDefaults } from './carrossel-auto.util';
import {
  assertScheduleValid,
  ERR_CARROSSEL_AUTO_DELETE_FORBIDDEN,
  ERR_CARROSSEL_REORDER_INCOMPLETO,
  ERR_CARROSSEL_TIPO_INVALIDO,
  ERR_EDITAL_NAO_ENCONTRADO,
  isEditalAberto,
  isPubliclyVisible,
} from './carrossel-visibility.util';

/** Temporary ordem offset to avoid unique conflicts during reorder. */
const REORDER_TEMP_BASE = 100_000;

export type CarrosselPublicDto = {
  id: number;
  tipo: TipoCarrossel;
  rotulo: string | null;
  titulo: string;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_link: string | null;
  imagem_url: string | null;
  icone: string | null;
  ordem: number;
  id_edital: number | null;
};

export type CarrosselGestaoDto = CarrosselPublicDto & {
  ativo: boolean;
  auto_edital_habilitado: boolean;
  inicio_em: Date | null;
  fim_em: Date | null;
  edital_numero_ano: string | null;
  edital_aberto: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type SincronizarAutoResult = {
  created: number;
  updated: number;
  skipped_disabled: number;
};

@Injectable()
export class CarrosselService {
  constructor(
    @InjectRepository(CarrosselItem)
    private readonly itemRepository: Repository<CarrosselItem>,
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
  ) {}

  private toPublic(item: CarrosselItem): CarrosselPublicDto {
    return {
      id: item.id,
      tipo: item.tipo,
      rotulo: item.rotulo ?? null,
      titulo: item.titulo,
      subtitulo: item.subtitulo ?? null,
      cta_texto: item.cta_texto ?? null,
      cta_link: item.cta_link ?? null,
      imagem_url: item.imagem_url ?? null,
      icone: item.icone ?? null,
      ordem: item.ordem,
      id_edital: item.id_edital ?? null,
    };
  }

  private async editalOpenMap(
    ids: Array<number | null | undefined>,
  ): Promise<Map<number, { aberto: boolean; numero_ano: string }>> {
    const unique = [
      ...new Set(ids.filter((id): id is number => id != null && id > 0)),
    ];
    const map = new Map<number, { aberto: boolean; numero_ano: string }>();
    if (unique.length === 0) return map;
    const editais = await this.editalRepository.find({
      where: { id: In(unique) },
    });
    for (const e of editais) {
      map.set(e.id, {
        aberto: isEditalAberto(e),
        numero_ano: e.numero_ano,
      });
    }
    return map;
  }

  private assertHttpsUrl(url: string | null | undefined, field: string): void {
    if (url == null || url === '') return;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException(`${field} deve ser uma URL HTTPS válida`);
    }
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(`${field} deve usar HTTPS`);
    }
  }

  private assertAbsoluteHttpUrl(
    url: string | null | undefined,
    field: string,
  ): void {
    if (url == null || url === '') return;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException(`${field} deve ser uma URL http(s) absoluta`);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException(`${field} deve usar http ou https`);
    }
  }

  private parseOptionalDate(
    value: string | null | undefined,
  ): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('data inválida');
    }
    return d;
  }

  async findPublic(now: Date = new Date()): Promise<CarrosselPublicDto[]> {
    const all = await this.itemRepository.find({
      order: { ordem: 'ASC', id: 'ASC' },
    });
    const openMap = await this.editalOpenMap(all.map((i) => i.id_edital));
    return all
      .filter((item) =>
        isPubliclyVisible(
          {
            tipo: item.tipo,
            ativo: item.ativo,
            auto_edital_habilitado: item.auto_edital_habilitado,
            inicio_em: item.inicio_em,
            fim_em: item.fim_em,
            edital_aberto:
              item.id_edital != null
                ? (openMap.get(item.id_edital)?.aberto ?? false)
                : false,
          },
          now,
        ),
      )
      .map((item) => this.toPublic(item));
  }

  async findGestao(): Promise<CarrosselGestaoDto[]> {
    const all = await this.itemRepository.find({
      order: { ordem: 'ASC', id: 'ASC' },
    });
    const openMap = await this.editalOpenMap(all.map((i) => i.id_edital));
    return all.map((item) => {
      const meta =
        item.id_edital != null ? openMap.get(item.id_edital) : undefined;
      return {
        ...this.toPublic(item),
        ativo: item.ativo,
        auto_edital_habilitado: item.auto_edital_habilitado,
        inicio_em: item.inicio_em ?? null,
        fim_em: item.fim_em ?? null,
        edital_numero_ano: meta?.numero_ano ?? null,
        edital_aberto: meta?.aberto ?? false,
        criado_em: item.criado_em,
        atualizado_em: item.atualizado_em,
      };
    });
  }

  async createManual(dto: CreateCarrosselManualDto): Promise<CarrosselGestaoDto> {
    const titulo = String(dto.titulo ?? '').trim();
    if (!titulo) {
      throw new BadRequestException('titulo é obrigatório');
    }
    this.assertHttpsUrl(dto.imagem_url, 'imagem_url');
    this.assertAbsoluteHttpUrl(dto.cta_link, 'cta_link');

    if (dto.id_edital != null) {
      const edital = await this.editalRepository.findOne({
        where: { id: dto.id_edital },
      });
      if (!edital) {
        throw new BadRequestException({
          code: ERR_EDITAL_NAO_ENCONTRADO,
          message: `Edital ${dto.id_edital} não encontrado`,
        });
      }
    }

    const inicio_em = this.parseOptionalDate(dto.inicio_em) ?? null;
    const fim_em = this.parseOptionalDate(dto.fim_em) ?? null;
    assertScheduleValid({ inicio_em, fim_em });

    let ordem = dto.ordem;
    if (ordem === undefined || ordem === null) {
      const last = await this.itemRepository.find({
        order: { ordem: 'DESC' },
        take: 1,
      });
      ordem = (last[0]?.ordem ?? 0) + 1;
    }

    const item = this.itemRepository.create({
      tipo: TipoCarrossel.MANUAL,
      titulo,
      rotulo: dto.rotulo ?? null,
      subtitulo: dto.subtitulo ?? null,
      cta_texto: dto.cta_texto ?? null,
      cta_link: dto.cta_link ?? null,
      imagem_url: dto.imagem_url ?? null,
      icone: dto.icone ?? 'GraduationCap',
      ordem,
      ativo: dto.ativo ?? true,
      id_edital: dto.id_edital ?? null,
      auto_edital_habilitado: true,
      inicio_em,
      fim_em,
    });
    const saved = await this.itemRepository.save(item);
    const gestao = await this.findGestao();
    return gestao.find((g) => g.id === saved.id)!;
  }

  async update(
    id: number,
    dto: UpdateCarrosselItemDto,
  ): Promise<CarrosselGestaoDto> {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item de carrossel ${id} não encontrado`);
    }

    if (item.tipo === TipoCarrossel.AUTO_EDITAL) {
      if (dto.id_edital !== undefined && dto.id_edital !== item.id_edital) {
        throw new BadRequestException({
          code: ERR_CARROSSEL_TIPO_INVALIDO,
          message: 'Não é possível alterar id_edital de item auto_edital',
        });
      }
    } else if (dto.id_edital !== undefined) {
      if (dto.id_edital != null) {
        const edital = await this.editalRepository.findOne({
          where: { id: dto.id_edital },
        });
        if (!edital) {
          throw new BadRequestException({
            code: ERR_EDITAL_NAO_ENCONTRADO,
            message: `Edital ${dto.id_edital} não encontrado`,
          });
        }
      }
      item.id_edital = dto.id_edital;
    }

    if (dto.titulo !== undefined) {
      const titulo = String(dto.titulo).trim();
      if (!titulo) throw new BadRequestException('titulo é obrigatório');
      item.titulo = titulo;
    }
    if (dto.rotulo !== undefined) item.rotulo = dto.rotulo;
    if (dto.subtitulo !== undefined) item.subtitulo = dto.subtitulo;
    if (dto.cta_texto !== undefined) item.cta_texto = dto.cta_texto;
    if (dto.cta_link !== undefined) {
      this.assertAbsoluteHttpUrl(dto.cta_link, 'cta_link');
      item.cta_link = dto.cta_link;
    }
    if (dto.imagem_url !== undefined) {
      this.assertHttpsUrl(dto.imagem_url, 'imagem_url');
      item.imagem_url = dto.imagem_url;
    }
    if (dto.icone !== undefined) item.icone = dto.icone;
    if (dto.ativo !== undefined) item.ativo = dto.ativo;
    if (dto.auto_edital_habilitado !== undefined) {
      item.auto_edital_habilitado = dto.auto_edital_habilitado;
    }
    if (dto.ordem !== undefined) item.ordem = dto.ordem;

    if (dto.inicio_em !== undefined) {
      item.inicio_em = this.parseOptionalDate(dto.inicio_em) ?? null;
    }
    if (dto.fim_em !== undefined) {
      item.fim_em = this.parseOptionalDate(dto.fim_em) ?? null;
    }
    assertScheduleValid({
      inicio_em: item.inicio_em,
      fim_em: item.fim_em,
    });

    await this.itemRepository.save(item);
    const gestao = await this.findGestao();
    return gestao.find((g) => g.id === id)!;
  }

  async setAutoHabilitado(
    id: number,
    auto_edital_habilitado: boolean,
  ): Promise<CarrosselGestaoDto> {
    return this.update(id, { auto_edital_habilitado });
  }

  async remove(id: number, hard = false): Promise<CarrosselGestaoDto[]> {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item de carrossel ${id} não encontrado`);
    }
    if (item.tipo === TipoCarrossel.AUTO_EDITAL) {
      throw new BadRequestException({
        code: ERR_CARROSSEL_AUTO_DELETE_FORBIDDEN,
        message:
          'Itens auto_edital não podem ser apagados; desative via auto_edital_habilitado',
      });
    }
    if (hard || item.id_edital == null) {
      await this.itemRepository.delete({ id });
    } else {
      item.ativo = false;
      await this.itemRepository.save(item);
    }
    return this.findGestao();
  }

  async reorder(ids: number[]): Promise<CarrosselGestaoDto[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException({
        code: ERR_CARROSSEL_REORDER_INCOMPLETO,
        message: 'ids deve ser um array não vazio',
      });
    }
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException({
        code: ERR_CARROSSEL_REORDER_INCOMPLETO,
        message: 'ids contém duplicados',
      });
    }

    const existing = await this.itemRepository.find({
      order: { ordem: 'ASC', id: 'ASC' },
    });
    const existingIds = new Set(existing.map((f) => f.id));
    if (
      ids.length !== existing.length ||
      ids.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException({
        code: ERR_CARROSSEL_REORDER_INCOMPLETO,
        message: 'ids deve listar exatamente todos os itens do carrossel',
      });
    }

    await this.itemRepository.manager.transaction(async (em) => {
      for (let i = 0; i < ids.length; i++) {
        await em.update(
          CarrosselItem,
          { id: ids[i] },
          { ordem: REORDER_TEMP_BASE + i },
        );
      }
      for (let i = 0; i < ids.length; i++) {
        await em.update(CarrosselItem, { id: ids[i] }, { ordem: i + 1 });
      }
    });

    return this.findGestao();
  }

  /**
   * Upsert auto row for one edital. Never re-enables admin-disabled toggle.
   * Called from EditaisService update hook and sincronizar-auto.
   */
  async syncAutoForEdital(edital: Edital): Promise<{
    action: 'created' | 'updated' | 'skipped_closed' | 'skipped_disabled';
  }> {
    const existing = await this.itemRepository.findOne({
      where: {
        tipo: TipoCarrossel.AUTO_EDITAL,
        id_edital: edital.id,
      },
    });

    if (!isEditalAberto(edital)) {
      return { action: 'skipped_closed' };
    }

    if (!existing) {
      const defaults = buildAutoEditalDefaults({
        id: edital.id,
        numero_ano: edital.numero_ano,
      });
      const last = await this.itemRepository.find({
        order: { ordem: 'DESC' },
        take: 1,
      });
      const ordem = (last[0]?.ordem ?? 0) + 1;
      await this.itemRepository.save(
        this.itemRepository.create({ ...defaults, ordem }),
      );
      return { action: 'created' };
    }

    // Update title from edital; never flip auto_edital_habilitado back to true.
    existing.titulo = edital.numero_ano;
    await this.itemRepository.save(existing);
    if (!existing.auto_edital_habilitado) {
      return { action: 'skipped_disabled' };
    }
    return { action: 'updated' };
  }

  async sincronizarAuto(): Promise<SincronizarAutoResult> {
    const open = await this.editalRepository.find({
      where: { publicado: true, inscricoes_abertas: true },
      order: { id: 'ASC' },
    });
    let created = 0;
    let updated = 0;
    let skipped_disabled = 0;
    for (const edital of open) {
      const { action } = await this.syncAutoForEdital(edital);
      if (action === 'created') created += 1;
      else if (action === 'updated') updated += 1;
      else if (action === 'skipped_disabled') skipped_disabled += 1;
    }
    return { created, updated, skipped_disabled };
  }
}
