import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import { LoginDto, LoginResponseDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(LocalGuard)
  @ApiOperation({
    summary: 'Autentica usuário e retorna JWT (público)',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    if (!body.email || !body.senha) {
      throw new BadRequestException('Email e senha são obrigatórios');
    }

    const user = await this.authService.validateUser(body.email, body.senha);
    return this.authService.login(user);
  }
}
