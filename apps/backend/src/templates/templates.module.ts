import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBiblioteca } from './entities/template-biblioteca.entity';
import { TemplateEdital } from './entities/template-edital.entity';
import { Edital } from '../editais/entities/edital.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TemplateBiblioteca, TemplateEdital, Edital]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
