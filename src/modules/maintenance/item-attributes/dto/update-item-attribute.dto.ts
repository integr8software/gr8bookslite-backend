import { PartialType } from '@nestjs/swagger';
import { CreateItemAttributeDto } from './create-item-attribute.dto';

export class UpdateItemAttributeDto extends PartialType(CreateItemAttributeDto) {}
