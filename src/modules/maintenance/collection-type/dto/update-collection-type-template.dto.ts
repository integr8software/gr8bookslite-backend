import { PartialType } from '@nestjs/swagger';
import { CreateCollectionTypeTemplateDto } from './create-collection-type-template.dto';

export class UpdateCollectionTypeTemplateDto extends PartialType(CreateCollectionTypeTemplateDto) {}
