import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { Cursos } from '@repo/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CursosService {
  private cursos: Cursos[] = [];

  create(createCursoDto: CreateCursoDto): Cursos {

    const novoCurso: Cursos = { 
      ...createCursoDto,
      id_curso: uuidv4()
    };

    this.cursos.push(novoCurso);
    return novoCurso
  }

  findAll(): Cursos[] {
    return this.cursos;
  }

  findOne(id: string): Cursos {
    const id_curso = this.cursos.find(c => c.id_curso === id);
    if (!id_curso) throw new NotFoundException(`Curso com id ${id} não encontrado`);
    return id_curso;
  }

  update(id: string, updateCursoDto: UpdateCursoDto): Cursos {
    const id_curso = this.cursos.findIndex(c => c.id_curso === id);

    if (!id_curso) throw new NotFoundException(`Curso com id ${id} não encontrado`);

    const cursoAtualizado = {...this.cursos[id_curso], ...updateCursoDto}
    this.cursos[id_curso] = cursoAtualizado;
    return cursoAtualizado;
  }

  remove(id: string): void {
    const index = this.cursos.findIndex(c => c.id_curso === id);
    if (index === -1) throw new NotFoundException(`Curso com id ${id} não encontrado`);
    this.cursos.splice(index, 1);
  }
}
