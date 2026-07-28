import { Injectable } from '@nestjs/common';
import { StatusCandidatura } from '@repo/types';
import { CandidaturasService } from '../candidaturas/candidaturas.service';
import { isProtocoloValidoParaStatus } from '../candidaturas/protocolo.util';

export type ProtocoloValidacaoResponse = {
  protocolo: string;
  valido: boolean;
  motivo?: string;
  status?: StatusCandidatura;
  id_candidatura?: number;
  candidato?: string;
  curso?: string;
  campus?: string;
  data_inscricao?: string;
};

@Injectable()
export class ProtocolosService {
  constructor(private readonly candidaturasService: CandidaturasService) {}

  async validar(protocoloRaw: string): Promise<ProtocoloValidacaoResponse> {
    const protocolo = decodeURIComponent(protocoloRaw).trim();
    if (!protocolo) {
      return { protocolo: '', valido: false, motivo: 'Protocolo ausente' };
    }

    const candidatura =
      await this.candidaturasService.findByProtocolo(protocolo);
    if (!candidatura) {
      return {
        protocolo,
        valido: false,
        motivo: 'Protocolo não encontrado',
      };
    }

    const valido = isProtocoloValidoParaStatus(candidatura.status);
    return {
      protocolo,
      valido,
      motivo: valido
        ? undefined
        : 'Protocolo invalidado (inscrição cancelada ou inativa)',
      status: candidatura.status,
      id_candidatura: candidatura.id,
      candidato: candidatura.usuario?.nome_completo,
      curso: candidatura.oferta?.curso?.nome,
      campus: candidatura.oferta?.campus?.nome,
      data_inscricao: candidatura.data_inscricao,
    };
  }
}
