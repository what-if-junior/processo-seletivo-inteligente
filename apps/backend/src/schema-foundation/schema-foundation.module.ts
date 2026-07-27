import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campus } from '../campus/entities/campus.entity';
import { Edital } from '../editais/entities/edital.entity';
import { EditalArquivo } from '../editais/entities/edital-arquivo.entity';
import { Oferta } from '../ofertas/entities/oferta.entity';
import { DistribuicaoCota } from '../distribuicao-cotas/entities/distribuicao-cota.entity';

/**
 * W1 schema foundation — entity registration only.
 * CRUD controllers arrive in W3–W4.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campus,
      Edital,
      EditalArquivo,
      Oferta,
      DistribuicaoCota,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class SchemaFoundationModule {}
