import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GestoresService } from '../gestores/gestores.service';
import * as bcrypt from 'bcrypt';
import { AuthPayloadDto } from './dto/auth.dto';

export type LoginIdentifier = {
  email?: string;
  CPF?: string;
  senha: string;
};

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private gestoresService: GestoresService,
  ) {}

  /** Accepts e-mail or CPF + senha. Missing user and bad password both → 401. */
  async validateUser(email: string, senha: string) {
    return this.validateCredentials({ email, senha });
  }

  async validateCredentials(input: LoginIdentifier) {
    const email = input.email?.trim() || undefined;
    const CPF = input.CPF?.trim() || undefined;
    if (!input.senha || (!email && !CPF)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    let user;
    try {
      user = email
        ? await this.userService.findByEmail(email)
        : await this.userService.findByCpf(CPF!);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
      throw err;
    }

    const passwordMatch = await bcrypt.compare(input.senha, user.senha);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // REQ-2.8: conta desativada perde o login mas mantém as inscrições.
    if (user.ativo === false) {
      throw new UnauthorizedException('Conta desativada');
    }

    const { senha: _, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string }) {
    // ISSUE-012: claim de papel no JWT — 'gestor' se membro de Gestores, senão 'candidato'.
    const isGestor = await this.gestoresService.isGestor(user.id);
    const payload: AuthPayloadDto = {
      sub: user.id,
      email: user.email,
      role: isGestor ? 'gestor' : 'candidato',
    };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
