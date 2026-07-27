import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { TipoDocumentoCampo } from './entities/tipo-documento-campo.entity';
import { TiposDocumentoService } from './tipos-documento.service';
import { TiposDocumentoController } from './tipos-documento.controller';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoDocumento,
      TipoDocumentoCampo,
      Edital,
      Candidatura,
    ]),
  ],
  controllers: [TiposDocumentoController],
  providers: [TiposDocumentoService],
  exports: [TiposDocumentoService],
})
export class TiposDocumentoModule {}
