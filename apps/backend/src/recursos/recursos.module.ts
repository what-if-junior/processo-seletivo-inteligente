import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recurso } from './entities/recurso.entity';
import { RecursosService } from './recursos.service';
import { RecursosController } from './recursos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Recurso])],
  controllers: [RecursosController],
  providers: [RecursosService],
  exports: [RecursosService],
})
export class RecursosModule {}
