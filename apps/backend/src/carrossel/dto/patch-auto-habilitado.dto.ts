import { ApiProperty } from '@nestjs/swagger';

export class PatchAutoHabilitadoDto {
  @ApiProperty({ example: false })
  auto_edital_habilitado: boolean;
}
