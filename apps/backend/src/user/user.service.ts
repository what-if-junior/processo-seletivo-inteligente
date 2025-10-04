/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Usuario } from '../../../../packages/types/index';

@Injectable()
export class UserService {
  private users: Usuario[] = [];

  create(createUserDto: CreateUserDto): Usuario {
    const newUser: Usuario = {
      id_usuario: (this.users.length + 1).toString(),
      ...createUserDto,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  findAll(): Usuario[] {
    return this.users;
  }

  findOne(id: string): Usuario | { message: string } {
    const user = this.users.find(user => user.id_usuario === id);
    if (!user) return { message: `User ${id} not found` };
    return user;
  }

  update(id: string, updateUserDto: UpdateUserDto): Usuario | { message: string } {
    const index = this.users.findIndex(user => user.id_usuario === id);
    if (index === -1) return { message: `User ${id} not found` };

    this.users[index] = {
      ...this.users[index],
      ...updateUserDto,
      atualizado_em: new Date(),
    };
    return this.users[index];
  }

  remove(id: string): Usuario | { message: string } {
    const index = this.users.findIndex(user => user.id_usuario === id);
    if (index === -1) return { message: `User ${id} not found` };

    const deleted = this.users[index];
    this.users.splice(index, 1);
    return deleted;
  }
}
