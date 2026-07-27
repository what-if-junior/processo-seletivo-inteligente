import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Edital } from './entities/edital.entity';
import { EditalArquivo } from './entities/edital-arquivo.entity';
import { EditaisController } from './editais.controller';
import { EditaisService } from './editais.service';

@Module({
  imports: [TypeOrmModule.forFeature([Edital, EditalArquivo])],
  controllers: [EditaisController],
  providers: [EditaisService],
  exports: [EditaisService],
})
export class EditaisModule {}
