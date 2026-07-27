import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { UserService } from '../user/user.service';

type JwtUser = { sub: number; email?: string };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary:
      'Autentica por e-mail ou CPF + senha e retorna JWT (público, REQ-2.1)',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    const email = body.email?.trim() || undefined;
    const CPF = body.CPF?.trim() || undefined;
    if (!body.senha || (!email && !CPF)) {
      throw new BadRequestException('Informe e-mail ou CPF e senha');
    }

    const user = await this.authService.validateCredentials({
      email,
      CPF,
      senha: body.senha,
    });
    return this.authService.login(user);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({
    summary: 'Perfil do utilizador autenticado (JWT sub → Usuarios)',
  })
  me(@Req() req: Request) {
    const user = req.user as JwtUser | undefined;
    const id = Number(user?.sub);
    return this.userService.findById(id);
  }
}
