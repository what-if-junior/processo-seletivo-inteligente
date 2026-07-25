import { ApiProperty } from '@nestjs/swagger';

export class AuthPayloadDto {
  sub: number;
  email: string;
}

export class LoginDto {
  @ApiProperty({ example: 'joao@teste.com' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  senha: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT para Authorization: Bearer <token>',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}
