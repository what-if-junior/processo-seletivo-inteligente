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
      ppi: createUserDto.ppi,
      pcd: createUserDto.pcd ?? false,
      nome_RG: createUserDto.nome_RG,
      nome_historico_escolar: createUserDto.nome_historico_escolar,
      foto_alt: createUserDto.foto_alt,
      enderecos: createUserDto.endereco
        ? [createUserDto.endereco]
        : undefined,
    });

    const saved = await this.userRepository.save(user);
    return this.findById(saved.id);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { enderecos: true },
      order: { id: 'ASC' },
    });
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.senha')
      .leftJoinAndSelect('usuario.enderecos', 'enderecos')
      .where('usuario.email = :email', { email })
      .getOne();

    if (!user) {
      throw new NotFoundException(
        `Usuário com email: '${email}' não encontrado`,
      );
    }
    return user;
  }

  /** Lookup by CPF digits only (ignores `.` / `-` in stored value). */
  async findByCpf(cpf: string): Promise<User> {
    const digits = cpf.replace(/\D/g, '');
    if (!digits) {
      throw new NotFoundException(`Usuário com CPF inválido`);
    }
    const user = await this.userRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.senha')
      .leftJoinAndSelect('usuario.enderecos', 'enderecos')
      .where(
        `regexp_replace(usuario."CPF", '[^0-9]', '', 'g') = :digits`,
        { digits },
      )
      .getOne();

    if (!user) {
      throw new NotFoundException(`Usuário com CPF '${digits}' não encontrado`);
    }
    return user;
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { enderecos: true },
    });
    if (!user) throw new NotFoundException(`Usuário ${id} não encontrado`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    const { endereco, senha, ...rest } = dto as UpdateUserDto & {
      endereco?: CreateUserDto['endereco'];
      senha?: string;
    };

    Object.assign(user, rest);

    if (senha) {
      user.senha = await bcrypt.hash(senha, 10);
    }

    if (endereco) {
      user.enderecos = [endereco as never];
    }

    await this.userRepository.save(user);
    return this.findById(id);
  }

  /** REQ-2.8: desabilitar o acesso bloqueia o login sem tocar nas inscrições. */
  async setAtivo(id: number, ativo: boolean): Promise<User> {
    const user = await this.findById(id);
    user.ativo = ativo;
    await this.userRepository.save(user);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
