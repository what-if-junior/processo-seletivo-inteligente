import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.senha, 10);

    const user = this.userRepository.create({
      nome_completo: createUserDto.nome_completo,
      email: createUserDto.email,
      senha: hashedPassword,
      CPF: createUserDto.CPF,
      data_nascimento: createUserDto.data_nascimento,
      telefone: createUserDto.telefone,
      renda_familiar: createUserDto.renda_familiar,
      etnia: createUserDto.etnia,
      pcd: createUserDto.pcd ?? false,
      RG: createUserDto.RG,
      historico_escolar: createUserDto.historico_escolar,
      foto: createUserDto.foto,
      endereco: createUserDto.endereco ? { ...createUserDto.endereco } : undefined,
    });

    return this.userRepository.save(user);
  }


  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id_usuario: id } });
    if (!user) throw new NotFoundException(`Usuário ${id} não encontrado`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto, { atualizado_em: new Date() });
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
