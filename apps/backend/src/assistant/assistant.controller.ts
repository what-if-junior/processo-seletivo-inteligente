import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';
import { FeedbackDto } from './dto/feedback.dto';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Public()
  @Post('chat')
  @ApiOperation({ summary: 'Envia mensagem ao assistente (n8n)' })
  chat(@Body() dto: ChatDto, @Req() req: { headers: Record<string, string> }) {
    const bearer = req.headers['authorization'] ?? null;
    return this.assistantService.chat(dto, bearer);
  }

  @Public()
  @Post('feedback')
  @ApiOperation({ summary: 'Registra feedback thumbs' })
  feedback(@Body() dto: FeedbackDto) {
    return this.assistantService.feedback(dto);
  }

  @Get('auditoria')
  @Roles('gestor')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Lista auditoria de interações' })
  auditoria() {
    return this.assistantService.listAuditoria();
  }

  @Get('ingestoes')
  @Roles('gestor')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Lista fila de ingestões RAG' })
  ingestoes() {
    return this.assistantService.listIngestoes();
  }

  @Post('ingestoes/flush')
  @Roles('gestor')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
  @ApiOperation({ summary: 'Descarrega fila de ingestões para o n8n' })
  flush() {
    return this.assistantService.flushIngestoes();
  }
}