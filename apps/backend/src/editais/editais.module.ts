import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Edital } from './entities/edital.entity';
import { EditalArquivo } from './entities/edital-arquivo.entity';
import { EditaisController } from './editais.controller';
import { EditaisService } from './editais.service';
import { TiposDocumentoBaseModule } from '../tipos-documento-base/tipos-documento-base.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Edital, EditalArquivo]),
    TiposDocumentoBaseModule,
  ],
  controllers: [EditaisController],
  providers: [EditaisService],
  exports: [EditaisService],
})
export class EditaisModule {}
