import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChamadasService } from './chamadas.service';
import { ChamadasController } from './chamadas.controller';
import { Chamada } from './entities/chamada.entity';
import { ChamadaVaga } from './entities/chamada-vaga.entity';
import { ClassificacaoItem } from './entities/classificacao-item.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chamada,
      ChamadaVaga,
      ClassificacaoItem,
      Oferta,
      Candidatura,
    ]),
    NotificacoesModule,
  ],
  controllers: [ChamadasController],
  providers: [ChamadasService],
  exports: [ChamadasService],
})
export class ChamadasModule {}
