import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoEntregaDocumental } from './entities/configuracao-entrega-documental.entity';

/** Schema entity for REQ-1.6; HTTP CRUD lands in the same module. */
@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracaoEntregaDocumental])],
  exports: [TypeOrmModule],
})
export class EntregaDocumentalModule {}
