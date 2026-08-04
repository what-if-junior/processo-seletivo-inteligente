import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HubService } from './hub.service';
import {
  CreateHubContactoDto,
  CreateHubFaqDto,
  ReorderHubDto,
  UpdateHubContactoDto,
  UpdateHubFaqDto,
  UpdateHubLgpdDto,
} from './dto/hub.dto';

@ApiTags('hub')
@Controller('hub')
export class HubController {
  constructor(private readonly hubService: HubService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Hub público: FAQ ativos, contactos ativos, texto LGPD (W33)',
  })
  getPublic() {
    return this.hubService.getPublic();
  }

  @Get('gestao')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Hub gestão (incl. inativos) + LGPD (JWT)' })
  getGestao() {
    return this.hubService.getGestao();
  }

  @Post('faqs')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  createFaq(@Body() dto: CreateHubFaqDto) {
    return this.hubService.createFaq(dto);
  }

  @Patch('faqs/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  updateFaq(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHubFaqDto,
  ) {
    return this.hubService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  deleteFaq(@Param('id', ParseIntPipe) id: number) {
    return this.hubService.deleteFaq(id);
  }

  @Put('faqs/reorder')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  reorderFaqs(@Body() dto: ReorderHubDto) {
    return this.hubService.reorderFaqs(dto.ids);
  }

  @Post('contactos')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  createContacto(@Body() dto: CreateHubContactoDto) {
    return this.hubService.createContacto(dto);
  }

  @Patch('contactos/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  updateContacto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHubContactoDto,
  ) {
    return this.hubService.updateContacto(id, dto);
  }

  @Delete('contactos/:id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  deleteContacto(@Param('id', ParseIntPipe) id: number) {
    return this.hubService.deleteContacto(id);
  }

  @Put('contactos/reorder')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  reorderContactos(@Body() dto: ReorderHubDto) {
    return this.hubService.reorderContactos(dto.ids);
  }

  @Put('lgpd')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Atualiza texto LGPD global (null = fallback PWA)' })
  updateLgpd(@Body() dto: UpdateHubLgpdDto) {
    return this.hubService.updateLgpd(dto);
  }
}
