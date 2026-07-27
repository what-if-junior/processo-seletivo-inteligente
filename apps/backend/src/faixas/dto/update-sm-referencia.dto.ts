import { ApiProperty } from '@nestjs/swagger';

export class UpdateSmReferenciaDto {
  @ApiProperty({
    example: 1518,
    description: 'Valor de referência do salário mínimo (R$)',
  })
  salario_minimo_referencia: number;
}
