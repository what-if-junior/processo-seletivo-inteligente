import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { AuthPayloadDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, senha: string) {
    const user = this.userService.findAll().find((u) => u.email === email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const passwordMatch = await bcrypt.compare(senha, user.senha);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const { senha: _, ...result } = user; 
    return result;
  }

  async login(user: { id_usuario: string; email: string }) {
    const payload: AuthPayloadDto = { sub: user.id_usuario, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
