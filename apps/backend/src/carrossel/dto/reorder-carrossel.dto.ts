import { ApiProperty } from '@nestjs/swagger';

export class ReorderCarrosselDto {
  @ApiProperty({
    type: [Number],
    example: [3, 1, 2],
    description: 'IDs na nova ordem (todos os itens existentes)',
  })
  ids: number[];
}
