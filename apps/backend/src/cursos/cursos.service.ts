import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { Curso } from './entities/curso.entity';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
  ) {}

  async create(createCursoDto: CreateCursoDto): Promise<Curso> {
    const novoCurso = this.cursoRepository.create(createCursoDto);
    return this.cursoRepository.save(novoCurso);
  }

  async findAll(): Promise<Curso[]> {
    return this.cursoRepository.find();
  }

  async findOne(id: string): Promise<Curso> {
    const curso = await this.cursoRepository.findOne({ where: { id_curso: id } });
    if (!curso) throw new NotFoundException(`Curso com id ${id} não encontrado`);
    return curso;
  }

  async update(id: string, updateCursoDto: UpdateCursoDto): Promise<Curso> {
    const curso = await this.findOne(id);
    Object.assign(curso, updateCursoDto);
    return this.cursoRepository.save(curso);
  }

  async remove(id: string): Promise<void> {
    const result = await this.cursoRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Curso com id ${id} não encontrado`);
  }
}
