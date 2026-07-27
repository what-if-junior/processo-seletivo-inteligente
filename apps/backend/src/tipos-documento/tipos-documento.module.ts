import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { TipoDocumentoCampo } from './entities/tipo-documento-campo.entity';

/** Schema entities for REQ-1.4; HTTP CRUD lands in the same module. */
@Module({
  imports: [TypeOrmModule.forFeature([TipoDocumento, TipoDocumentoCampo])],
  exports: [TypeOrmModule],
})
export class TiposDocumentoModule {}
