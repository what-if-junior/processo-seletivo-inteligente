import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Documento } from './entities/documento.entity';
import { DocumentoAuditoria } from './entities/documento-auditoria.entity';
import { MotivoHomologacaoDocumento } from './entities/motivo-homologacao-documento.entity';
import { DocumentosService } from './documentos.service';
import { DocumentosController } from './documentos.controller';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { CronogramaModule } from '../cronograma/cronograma.module';
import { Notificacao } from '../notificacoes/entities/notificacao.entity';
import { NotificacaoLeitura } from '../notificacoes/entities/notificacao-leitura.entity';
import { TipoDocumento } from '../tipos-documento/entities/tipo-documento.entity';
import { TiposDocumentoBaseModule } from '../tipos-documento-base/tipos-documento-base.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Documento,
      DocumentoAuditoria,
      MotivoHomologacaoDocumento,
      Candidatura,
      Notificacao,
      NotificacaoLeitura,
      TipoDocumento,
    ]),
    CronogramaModule,
    TiposDocumentoBaseModule,
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
