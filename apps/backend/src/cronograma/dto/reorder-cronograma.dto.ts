import { ApiProperty } from '@nestjs/swagger';

export class ReorderCronogramaDto {
  @ApiProperty({
    type: [Number],
    example: [3, 1, 2],
    description: 'IDs na nova ordem (todos do edital)',
  })
  ids: number[];
}
