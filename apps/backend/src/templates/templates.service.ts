import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateBiblioteca } from './entities/template-biblioteca.entity';
import { TemplateEdital } from './entities/template-edital.entity';
import { Edital } from '../editais/entities/edital.entity';
import {
  CopiarTemplateEditalDto,
  CreateTemplateBibliotecaDto,
  UpdateTemplateBibliotecaDto,
  UpdateTemplateEditalDto,
} from './dto/templates.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TemplateBiblioteca)
    private readonly bibRepo: Repository<TemplateBiblioteca>,
    @InjectRepository(TemplateEdital)
    private readonly editalTplRepo: Repository<TemplateEdital>,
    @InjectRepository(Edital)
    private readonly editalRepo: Repository<Edital>,
  ) {}

  listBiblioteca(ativosOnly = false) {
    return this.bibRepo.find({
      where: ativosOnly ? { ativo: true } : undefined,
      order: { id: 'ASC' },
    });
  }

  async getBiblioteca(id: number) {
    const row = await this.bibRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Template biblioteca ${id} não encontrado`);
    return row;
  }

  createBiblioteca(dto: CreateTemplateBibliotecaDto) {
    return this.bibRepo.save(
      this.bibRepo.create({
        titulo: dto.titulo.trim(),
        corpo: dto.corpo,
        canal: dto.canal ?? null,
        tipo_uso: dto.tipo_uso ?? null,
        ativo: dto.ativo ?? true,
      }),
    );
  }

  async updateBiblioteca(id: number, dto: UpdateTemplateBibliotecaDto) {
    const row = await this.getBiblioteca(id);
    if (dto.titulo !== undefined) row.titulo = dto.titulo.trim();
    if (dto.corpo !== undefined) row.corpo = dto.corpo;
    if (dto.canal !== undefined) row.canal = dto.canal;
    if (dto.tipo_uso !== undefined) row.tipo_uso = dto.tipo_uso;
    if (dto.ativo !== undefined) row.ativo = dto.ativo;
    return this.bibRepo.save(row);
  }

  async deleteBiblioteca(id: number) {
    const row = await this.getBiblioteca(id);
    const refs = await this.editalTplRepo.count({
      where: { id_template_origem: id },
    });
    if (refs > 0) {
      row.ativo = false;
      return this.bibRepo.save(row);
    }
    await this.bibRepo.delete(id);
    return { deleted: true, id };
  }

  private async requireEdital(editalId: number) {
    const e = await this.editalRepo.findOne({ where: { id: editalId } });
    if (!e) throw new NotFoundException(`Edital ${editalId} não encontrado`);
    return e;
  }

  async listEdital(editalId: number, tipoUso?: string) {
    await this.requireEdital(editalId);
    const where: { id_edital: number; tipo_uso?: string } = {
      id_edital: editalId,
    };
    if (tipoUso) where.tipo_uso = tipoUso;
    return this.editalTplRepo.find({
      where,
      order: { id: 'ASC' },
    });
  }

  async copiarParaEdital(editalId: number, dto: CopiarTemplateEditalDto) {
    await this.requireEdital(editalId);
    const src = await this.getBiblioteca(dto.id_template_biblioteca);
    if (!src.ativo) {
      throw new BadRequestException('template biblioteca inativo');
    }
    return this.editalTplRepo.save(
      this.editalTplRepo.create({
        id_template_origem: src.id,
        id_edital: editalId,
        titulo: src.titulo,
        corpo: src.corpo,
        canal: src.canal ?? null,
        tipo_uso: src.tipo_uso ?? null,
      }),
    );
  }

  async updateEdital(
    editalId: number,
    id: number,
    dto: UpdateTemplateEditalDto,
  ) {
    await this.requireEdital(editalId);
    const row = await this.editalTplRepo.findOne({
      where: { id, id_edital: editalId },
    });
    if (!row) {
      throw new NotFoundException(
        `Template edital ${id} não encontrado no edital ${editalId}`,
      );
    }
    if (dto.titulo !== undefined) row.titulo = dto.titulo.trim();
    if (dto.corpo !== undefined) row.corpo = dto.corpo;
    if (dto.canal !== undefined) row.canal = dto.canal;
    if (dto.tipo_uso !== undefined) row.tipo_uso = dto.tipo_uso;
    return this.editalTplRepo.save(row);
  }

  async deleteEdital(editalId: number, id: number) {
    await this.requireEdital(editalId);
    const result = await this.editalTplRepo.delete({
      id,
      id_edital: editalId,
    });
    if (!result.affected) {
      throw new NotFoundException(
        `Template edital ${id} não encontrado no edital ${editalId}`,
      );
    }
  }
}
