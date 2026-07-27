import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CampusService } from './campus.service';

@ApiTags('campus')
@Controller('campus')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista campi do catálogo (público)' })
  findAll() {
    return this.campusService.findAll();
  }
}
