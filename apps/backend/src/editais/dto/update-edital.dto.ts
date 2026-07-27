import { PartialType } from '@nestjs/swagger';
import { CreateEditalDto } from './create-edital.dto';

export class UpdateEditalDto extends PartialType(CreateEditalDto) {}
