import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { Curso } from './entities/curso.entity';
import { CandidaturasService } from '../candidaturas/candidaturas.service';
import { Oferta } from '../ofertas/entities/oferta.entity';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    private readonly candidaturasService: CandidaturasService,
  ) {}

  async create(createCursoDto: CreateCursoDto): Promise<Curso> {
    const novoCurso = this.cursoRepository.create(createCursoDto);
    return this.cursoRepository.save(novoCurso);
  }

  async findAll(): Promise<Curso[]> {
    return this.cursoRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Curso> {
    const curso = await this.cursoRepository.findOne({ where: { id } });
    if (!curso) throw new NotFoundException(`Curso com id ${id} não encontrado`);
    return curso;
  }

  async findCandidaturas(id: number) {
    const ofertas = await this.ofertaRepository.find({
      where: { id_curso: id },
      select: ['id'],
    });
    if (ofertas.length === 0) {
      await this.findOne(id);
      return [];
    }
    const results = await Promise.all(
      ofertas.map((oferta) => this.candidaturasService.findByOferta(oferta.id)),
    );
    return results.flat();
  }

  async update(id: number, updateCursoDto: UpdateCursoDto): Promise<Curso> {
    const curso = await this.findOne(id);
    Object.assign(curso, updateCursoDto);
    return this.cursoRepository.save(curso);
  }

  async remove(id: number): Promise<void> {
    const result = await this.cursoRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Curso com id ${id} não encontrado`);
  }
}
