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
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { UpdatePreferenciaNotificacaoDto } from './dto/update-preferencia.dto';
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
  constructor(private readonly notificacoesService: NotificacoesService) {}

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

  // ─── Admin / gestao ────────────────────────────────────────────────────────

  @Get()
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
  @ApiOperation({ summary: 'Lista configuração de lembretes (JWT)' })
  listLembretes() {
    return this.notificacoesService.listLembretes();
  }

  @Post('lembretes')
  @ApiOperation({ summary: 'Cria lembrete (ex.: matrícula due) (JWT)' })
  createLembrete(@Body() dto: CreateLembreteDto) {
    return this.notificacoesService.createLembrete(dto);
  }

  @Post('lembretes/processar')
  @ApiOperation({
    summary:
      'Dispara lembretes vencidos (matrícula approaching, etc.) — JWT admin',
  })
  processLembretes() {
    return this.notificacoesService.processLembretes();
  }

  @Patch('lembretes/:id')
  @ApiOperation({ summary: 'Atualiza lembrete (JWT)' })
  updateLembrete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLembreteDto,
  ) {
    return this.notificacoesService.updateLembrete(id, dto);
  }

  @Delete('lembretes/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove lembrete (JWT)' })
  removeLembrete(@Param('id', ParseIntPipe) id: number) {
    return this.notificacoesService.removeLembrete(id);
  }
}
