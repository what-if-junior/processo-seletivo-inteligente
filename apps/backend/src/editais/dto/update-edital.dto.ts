import { PartialType } from '@nestjs/mapped-types';
import { CreateEditalDto } from './create-edital.dto';

export class UpdateEditalDto extends PartialType(CreateEditalDto) {}
