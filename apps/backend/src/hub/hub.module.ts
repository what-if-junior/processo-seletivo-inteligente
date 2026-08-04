import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoGlobal } from '../faixas/entities/configuracao-global.entity';
import { HubFaqItem } from './entities/hub-faq-item.entity';
import { HubContacto } from './entities/hub-contacto.entity';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HubFaqItem, HubContacto, ConfiguracaoGlobal]),
  ],
  controllers: [HubController],
  providers: [HubService],
  exports: [HubService],
})
export class HubModule {}
