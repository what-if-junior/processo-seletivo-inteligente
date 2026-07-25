import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gestor } from './entities/gestor.entity';
import { GestoresService } from './gestores.service';
import { GestoresController } from './gestores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Gestor])],
  controllers: [GestoresController],
  providers: [GestoresService],
  exports: [GestoresService],
})
export class GestoresModule {}
