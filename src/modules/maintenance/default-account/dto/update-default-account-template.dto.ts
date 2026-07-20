import { PartialType } from '@nestjs/swagger';
import { CreateDefaultAccountTemplateDto } from './create-default-account-template.dto';

export class UpdateDefaultAccountTemplateDto extends PartialType(CreateDefaultAccountTemplateDto) {}
