import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfiguracaoGlobal } from '../faixas/entities/configuracao-global.entity';
import { HubFaqItem } from './entities/hub-faq-item.entity';
import { HubContacto } from './entities/hub-contacto.entity';
import {
  CreateHubContactoDto,
  CreateHubFaqDto,
  UpdateHubContactoDto,
  UpdateHubFaqDto,
  UpdateHubLgpdDto,
} from './dto/hub.dto';

const GLOBAL_ID = 1;
const REORDER_TEMP_BASE = 100_000;
const CONTACTO_TIPOS = new Set([
  'email',
  'telefone',
  'url',
  'endereco',
  'outro',
]);

export type HubPublicDto = {
  faqs: HubFaqItem[];
  contactos: HubContacto[];
  texto_lgpd: string | null;
  email_exclusao_dados: string;
};

@Injectable()
export class HubService {
  constructor(
    @InjectRepository(HubFaqItem)
    private readonly faqRepo: Repository<HubFaqItem>,
    @InjectRepository(HubContacto)
    private readonly contactoRepo: Repository<HubContacto>,
    @InjectRepository(ConfiguracaoGlobal)
    private readonly configRepo: Repository<ConfiguracaoGlobal>,
  ) {}

  private async requireConfig(): Promise<ConfiguracaoGlobal> {
    let config = await this.configRepo.findOne({ where: { id: GLOBAL_ID } });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({
          id: GLOBAL_ID,
          salario_minimo_referencia: 0,
          texto_lgpd: null,
        }),
      );
    }
    return config;
  }

  private normalizeTipo(tipo?: string | null): string {
    const t = (tipo ?? 'outro').trim().toLowerCase() || 'outro';
    if (!CONTACTO_TIPOS.has(t)) {
      throw new BadRequestException({
        code: 'HUB_CONTACTO_TIPO_INVALIDO',
        message: `tipo deve ser um de: ${[...CONTACTO_TIPOS].join(', ')}`,
      });
    }
    return t;
  }

  async getPublic(): Promise<HubPublicDto> {
    const [faqs, contactos, config] = await Promise.all([
      this.faqRepo.find({
        where: { ativo: true },
        order: { ordem: 'ASC', id: 'ASC' },
      }),
      this.contactoRepo.find({
        where: { ativo: true },
        order: { ordem: 'ASC', id: 'ASC' },
      }),
      this.requireConfig(),
    ]);
    return {
      faqs,
      contactos,
      texto_lgpd: config.texto_lgpd ?? null,
      email_exclusao_dados: 'reitoria@ifb.edu.br',
    };
  }

  async getGestao() {
    const [faqs, contactos, config] = await Promise.all([
      this.faqRepo.find({ order: { ordem: 'ASC', id: 'ASC' } }),
      this.contactoRepo.find({ order: { ordem: 'ASC', id: 'ASC' } }),
      this.requireConfig(),
    ]);
    return {
      faqs,
      contactos,
      texto_lgpd: config.texto_lgpd ?? null,
      email_exclusao_dados: 'reitoria@ifb.edu.br',
    };
  }

  async createFaq(dto: CreateHubFaqDto): Promise<HubFaqItem> {
    const max = await this.faqRepo
      .createQueryBuilder('f')
      .select('MAX(f.ordem)', 'max')
      .getRawOne<{ max: string | null }>();
    const ordem = dto.ordem ?? (Number(max?.max ?? 0) + 1);
    return this.faqRepo.save(
      this.faqRepo.create({
        pergunta: dto.pergunta.trim(),
        resposta: dto.resposta.trim(),
        ordem,
        ativo: dto.ativo ?? true,
      }),
    );
  }

  async updateFaq(id: number, dto: UpdateHubFaqDto): Promise<HubFaqItem> {
    const row = await this.faqRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`FAQ ${id} não encontrada`);
    if (dto.pergunta != null) row.pergunta = dto.pergunta.trim();
    if (dto.resposta != null) row.resposta = dto.resposta.trim();
    if (dto.ordem != null) row.ordem = dto.ordem;
    if (dto.ativo != null) row.ativo = dto.ativo;
    return this.faqRepo.save(row);
  }

  async deleteFaq(id: number): Promise<void> {
    const res = await this.faqRepo.delete({ id });
    if (!res.affected) throw new NotFoundException(`FAQ ${id} não encontrada`);
  }

  async reorderFaqs(ids: number[]): Promise<HubFaqItem[]> {
    return this.reorder(this.faqRepo, ids, 'FAQ');
  }

  async createContacto(dto: CreateHubContactoDto): Promise<HubContacto> {
    const max = await this.contactoRepo
      .createQueryBuilder('c')
      .select('MAX(c.ordem)', 'max')
      .getRawOne<{ max: string | null }>();
    const ordem = dto.ordem ?? (Number(max?.max ?? 0) + 1);
    return this.contactoRepo.save(
      this.contactoRepo.create({
        titulo: dto.titulo.trim(),
        valor: dto.valor.trim(),
        tipo: this.normalizeTipo(dto.tipo),
        ordem,
        ativo: dto.ativo ?? true,
      }),
    );
  }

  async updateContacto(
    id: number,
    dto: UpdateHubContactoDto,
  ): Promise<HubContacto> {
    const row = await this.contactoRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Contacto ${id} não encontrado`);
    if (dto.titulo != null) row.titulo = dto.titulo.trim();
    if (dto.valor != null) row.valor = dto.valor.trim();
    if (dto.tipo != null) row.tipo = this.normalizeTipo(dto.tipo);
    if (dto.ordem != null) row.ordem = dto.ordem;
    if (dto.ativo != null) row.ativo = dto.ativo;
    return this.contactoRepo.save(row);
  }

  async deleteContacto(id: number): Promise<void> {
    const res = await this.contactoRepo.delete({ id });
    if (!res.affected) {
      throw new NotFoundException(`Contacto ${id} não encontrado`);
    }
  }

  async reorderContactos(ids: number[]): Promise<HubContacto[]> {
    return this.reorder(this.contactoRepo, ids, 'Contacto');
  }

  async updateLgpd(dto: UpdateHubLgpdDto): Promise<{ texto_lgpd: string | null }> {
    const config = await this.requireConfig();
    if (dto.texto_lgpd === undefined) {
      return { texto_lgpd: config.texto_lgpd ?? null };
    }
    const next =
      dto.texto_lgpd == null || !String(dto.texto_lgpd).trim()
        ? null
        : String(dto.texto_lgpd).trim();
    config.texto_lgpd = next;
    await this.configRepo.save(config);
    return { texto_lgpd: next };
  }

  private async reorder<T extends { id: number; ordem: number }>(
    repo: Repository<T>,
    ids: number[],
    label: string,
  ): Promise<T[]> {
    if (!ids.length) {
      throw new BadRequestException({
        code: 'HUB_REORDER_EMPTY',
        message: 'ids é obrigatório',
      });
    }
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException({
        code: 'HUB_REORDER_DUPLICATE',
        message: 'ids não pode conter duplicados',
      });
    }
    const all = await repo.find();
    if (all.length !== ids.length || all.some((r) => !unique.has(r.id))) {
      throw new BadRequestException({
        code: 'HUB_REORDER_INCOMPLETE',
        message: `${label}: ids deve ser permutação completa`,
      });
    }
    await repo.manager.transaction(async (em) => {
      const r = em.getRepository(repo.target);
      for (let i = 0; i < ids.length; i++) {
        await r.update({ id: ids[i] } as never, {
          ordem: REORDER_TEMP_BASE + i,
        } as never);
      }
      for (let i = 0; i < ids.length; i++) {
        await r.update({ id: ids[i] } as never, { ordem: i + 1 } as never);
      }
    });
    return repo.find({
      where: { id: In(ids) } as never,
      order: { ordem: 'ASC', id: 'ASC' } as never,
    });
  }
}
