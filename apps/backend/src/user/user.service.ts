import { Usuario } from '@repo/types';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private users: Usuario[] = [];

  create(dto: CreateUserDto): Usuario {
    const newUser: Usuario = {
      id_usuario: (this.users.length + 1).toString(),
      ...dto,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  findAll(): Usuario[] {
    return this.users;
  }

  private findIndex(id: string): number {
    return this.users.findIndex(u => u.id_usuario === id);
  }

  findOne(id: string): Usuario | { message: string } {
    const user = this.users.find(u => u.id_usuario === id);
    return user || { message: `User ${id} not found` };
  }

  update(id: string, dto: UpdateUserDto): Usuario | { message: string } {
    const index = this.findIndex(id);
    if (index === -1) return { message: `User ${id} not found` };

    this.users[index] = { ...this.users[index], ...dto, atualizado_em: new Date() };
    return this.users[index];
  }

  remove(id: string): Usuario | { message: string } {
    const index = this.findIndex(id);
    if (index === -1) return { message: `User ${id} not found` };

    return this.users.splice(index, 1)[0];
  }
}
