import { PartialType } from '@nestjs/swagger';
import { CreateDisbursementTypeTemplateDto } from './create-disbursement-type-template.dto';

export class UpdateDisbursementTypeTemplateDto extends PartialType(CreateDisbursementTypeTemplateDto) {}
