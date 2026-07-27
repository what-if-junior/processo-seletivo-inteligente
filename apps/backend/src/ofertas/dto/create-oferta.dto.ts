import { TurnoOferta } from '@repo/types';

export class CreateOfertaDto {
  id_edital: number;
  id_curso: number;
  id_campus: number;
  turno: TurnoOferta;
  vagas_totais: number;
}
