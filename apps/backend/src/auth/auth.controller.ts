import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import { LoginDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalGuard)
  @ApiOperation({ summary: 'Autentica usuário e retorna JWT' })
  async login(@Body() body: LoginDto) {
    if (!body.email || !body.senha) {
      throw new BadRequestException('Email e senha são obrigatórios');
    }

    const user = await this.authService.validateUser(body.email, body.senha);
    return this.authService.login(user);
  }
}
