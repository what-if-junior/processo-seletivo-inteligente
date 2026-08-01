import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DashboardService, type DashboardFiltros } from './dashboard.service';

function toId(valor?: string): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function buildFiltros(query: Record<string, string | undefined>): DashboardFiltros {
  return {
    ano: query.ano?.trim() || null,
    id_campus: toId(query.id_campus),
    turno: query.turno?.trim().toUpperCase() || null,
    id_edital: toId(query.id_edital),
  };
}

@ApiTags('dashboard')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido' })
@ApiQuery({ name: 'ano', required: false })
@ApiQuery({ name: 'id_campus', required: false, type: Number })
@ApiQuery({ name: 'turno', required: false })
@ApiQuery({ name: 'id_edital', required: false, type: Number })
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('insights')
  @ApiOperation({
    summary: 'Indicadores do ciclo com filtros ano/campus/turno/edital (REQ-6.3)',
  })
  insights(@Query() query: Record<string, string | undefined>) {
    return this.service.getInsights(buildFiltros(query));
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="dashboard.csv"')
  @ApiOperation({ summary: 'Exporta a tabela do painel em CSV (REQ-6.3)' })
  exportCsv(@Query() query: Record<string, string | undefined>) {
    return this.service.exportCsv(buildFiltros(query));
  }
}
