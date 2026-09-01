import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { NotificacoesService } from './notificacoes.service';
import { PushService } from './push.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { UpdatePreferenciaNotificacaoDto } from './dto/update-preferencia.dto';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import {
  CreateLembreteDto,
  UpdateLembreteDto,
} from './dto/create-lembrete.dto';

type AuthUser = { sub: number; email?: string };

@ApiTags('notificacoes')
@Controller('notificacoes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
export class NotificacoesController {
  constructor(
    private readonly notificacoesService: NotificacoesService,
    private readonly pushService: PushService,
  ) {}

  // ─── Candidate ─────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Lista avisos do candidato autenticado (JWT)' })
  listMe(@Req() req: { user: AuthUser }) {
    return this.notificacoesService.listForUser(req.user.sub);
  }

  @Post('me/marcar-todas-lidas')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas (JWT)' })
  markAll(@Req() req: { user: AuthUser }) {
    return this.notificacoesService.markAllRead(req.user.sub);
  }

  @Patch(':id/lida')
  @ApiOperation({ summary: 'Marca notificação como lida (JWT)' })
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.notificacoesService.markRead(req.user.sub, id);
  }

  @Get('preferencias')
  @ApiOperation({ summary: 'Preferências de avisos do candidato (JWT)' })
  getPrefs(@Req() req: { user: AuthUser }) {
    return this.notificacoesService.getOrCreatePreferencias(req.user.sub);
  }

  @Patch('preferencias')
  @ApiOperation({ summary: 'Atualiza preferências de avisos (JWT)' })
  patchPrefs(
    @Req() req: { user: AuthUser },
    @Body() dto: UpdatePreferenciaNotificacaoDto,
  ) {
    return this.notificacoesService.updatePreferencias(req.user.sub, dto);
  }

  // ─── Web Push (W31-09) ─────────────────────────────────────────────────────

  @Post('push/subscribe')
  @ApiOperation({
    summary: 'Registra assinatura de Web Push do candidato (JWT)',
  })
  subscribePush(
    @Req() req: { user: AuthUser },
    @Body() dto: SubscribePushDto,
  ) {
    return this.pushService.subscribe(req.user.sub, dto);
  }

  @Post('push/unsubscribe')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove assinatura de Web Push (JWT)' })
  async unsubscribePush(
    @Req() req: { user: AuthUser },
    @Body() dto: UnsubscribePushDto,
  ) {
    await this.pushService.unsubscribe(req.user.sub, dto.endpoint);
  }

  @Get('push/status')
  @ApiOperation({
    summary: 'Status do push (ativo + nº de assinaturas) para a PWA (JWT)',
  })
  async pushStatus(@Req() req: { user: AuthUser }) {
    return {
      ativo: this.pushService.isEnabled(),
      assinaturas: await this.pushService.countForUser(req.user.sub),
    };
  }

  // ─── Admin / gestao ────────────────────────────────────────────────────────

  @Get()
  @Roles('gestor')
  @ApiQuery({ name: 'id_edital', required: false })
  @ApiOperation({ summary: 'Lista notificações (gestão JWT)' })
  listGestao(@Query('id_edital') idEdital?: string) {
    const id =
      idEdital != null && idEdital !== ''
        ? Number(idEdital)
        : undefined;
    return this.notificacoesService.listGestao(
      id != null && Number.isFinite(id) ? id : undefined,
    );
  }

  @Post()
  @Roles('gestor')
  @ApiOperation({
    summary:
      'Cria e (opcionalmente) envia notificação com audiência edital/campus/status',
  })
  create(
    @Body() dto: CreateNotificacaoDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.notificacoesService.createAndDispatch(dto, req.user.sub);
  }

  // ─── Lembretes ─────────────────────────────────────────────────────────────

  @Get('lembretes')
  @Roles('gestor')
  @ApiOperation({ summary: 'Lista configuração de lembretes (JWT)' })
  listLembretes() {
    return this.notificacoesService.listLembretes();
  }

  @Post('lembretes')
  @Roles('gestor')
  @ApiOperation({ summary: 'Cria lembrete (ex.: matrícula due) (JWT)' })
  createLembrete(@Body() dto: CreateLembreteDto) {
    return this.notificacoesService.createLembrete(dto);
  }

  @Post('lembretes/processar')
  @Roles('gestor')
  @ApiOperation({
    summary:
      'Dispara lembretes vencidos (matrícula approaching, etc.) — JWT admin',
  })
  processLembretes() {
    return this.notificacoesService.processLembretes();
  }

  @Patch('lembretes/:id')
  @Roles('gestor')
  @ApiOperation({ summary: 'Atualiza lembrete (JWT)' })
  updateLembrete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLembreteDto,
  ) {
    return this.notificacoesService.updateLembrete(id, dto);
  }

  @Delete('lembretes/:id')
  @HttpCode(204)
  @Roles('gestor')
  @ApiOperation({ summary: 'Remove lembrete (JWT)' })
  removeLembrete(@Param('id', ParseIntPipe) id: number) {
    return this.notificacoesService.removeLembrete(id);
  }
}
