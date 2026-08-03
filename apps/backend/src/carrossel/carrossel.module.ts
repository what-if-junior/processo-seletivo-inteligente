import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarrosselItem } from './entities/carrossel-item.entity';
import { Edital } from '../editais/entities/edital.entity';
import { CarrosselService } from './carrossel.service';
import { CarrosselController } from './carrossel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CarrosselItem, Edital])],
  controllers: [CarrosselController],
  providers: [CarrosselService],
  exports: [CarrosselService],
})
export class CarrosselModule {}
