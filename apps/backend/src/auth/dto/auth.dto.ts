import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthPayloadDto {
  sub: number;
  email: string;
}

export class LoginDto {
  @ApiPropertyOptional({
    example: 'joao@teste.com',
    description: 'E-mail do candidato (alternativa a CPF)',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '123.456.789-00',
    description: 'CPF do candidato (alternativa a e-mail); dígitos ou formatado',
  })
  CPF?: string;

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
