import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoDocumentoBase } from './entities/tipo-documento-base.entity';
import { DocumentoConta } from './entities/documento-conta.entity';
import { TipoDocumento } from '../tipos-documento/entities/tipo-documento.entity';
import { TiposDocumentoBaseService } from './tipos-documento-base.service';
import { TiposDocumentoBaseController } from './tipos-documento-base.controller';
import { DocumentosContaService } from './documentos-conta.service';
import { DocumentosContaController } from './documentos-conta.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoDocumentoBase,
      DocumentoConta,
      TipoDocumento,
    ]),
  ],
  controllers: [TiposDocumentoBaseController, DocumentosContaController],
  providers: [TiposDocumentoBaseService, DocumentosContaService],
  exports: [TiposDocumentoBaseService, DocumentosContaService],
})
export class TiposDocumentoBaseModule {}
