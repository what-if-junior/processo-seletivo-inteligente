import { ApiProperty } from '@nestjs/swagger';

export class ReorderFaixasDto {
  @ApiProperty({
    type: [Number],
    example: [3, 1, 2],
    description: 'IDs na nova ordem (todas as faixas existentes)',
  })
  ids: number[];
}
