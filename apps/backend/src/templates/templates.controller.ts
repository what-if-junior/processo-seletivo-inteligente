import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import {
  CopiarTemplateEditalDto,
  CreateTemplateBibliotecaDto,
  UpdateTemplateBibliotecaDto,
  UpdateTemplateEditalDto,
} from './dto/templates.dto';

@ApiTags('templates')
@ApiBearerAuth()
@Controller()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get('templates/biblioteca')
  @ApiOperation({ summary: 'Listar biblioteca de templates (W30)' })
  listBib(@Query('ativos') ativos?: string) {
    return this.templatesService.listBiblioteca(ativos === '1');
  }

  @Post('templates/biblioteca')
  @ApiOperation({ summary: 'Criar template na biblioteca' })
  createBib(@Body() dto: CreateTemplateBibliotecaDto) {
    return this.templatesService.createBiblioteca(dto);
  }

  @Get('templates/biblioteca/:id')
  getBib(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.getBiblioteca(id);
  }

  @Patch('templates/biblioteca/:id')
  updateBib(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateBibliotecaDto,
  ) {
    return this.templatesService.updateBiblioteca(id, dto);
  }

  @Delete('templates/biblioteca/:id')
  deleteBib(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.deleteBiblioteca(id);
  }

  @Get('editais/:editalId/templates')
  @ApiOperation({ summary: 'Templates copiados para o edital' })
  listEdital(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Query('tipo_uso') tipoUso?: string,
  ) {
    return this.templatesService.listEdital(editalId, tipoUso);
  }

  @Post('editais/:editalId/templates/copiar')
  @ApiOperation({ summary: 'Copiar template da biblioteca para o edital' })
  copiar(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Body() dto: CopiarTemplateEditalDto,
  ) {
    return this.templatesService.copiarParaEdital(editalId, dto);
  }

  @Patch('editais/:editalId/templates/:id')
  updateEdital(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateEditalDto,
  ) {
    return this.templatesService.updateEdital(editalId, id, dto);
  }

  @Delete('editais/:editalId/templates/:id')
  deleteEdital(
    @Param('editalId', ParseIntPipe) editalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.templatesService.deleteEdital(editalId, id);
  }
}
