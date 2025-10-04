/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { Usuario } from '../../../../packages/types/index';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Usuario {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll(): Usuario[] {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Usuario | { message: string } {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Usuario | { message: string } {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Usuario | { message: string } {
    return this.userService.remove(id);
  }
}
