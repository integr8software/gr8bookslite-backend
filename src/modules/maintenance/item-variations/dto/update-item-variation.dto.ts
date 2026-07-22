import { PartialType } from '@nestjs/swagger';
import { CreateItemVariationDto } from './create-item-variation.dto';

export class UpdateItemVariationDto extends PartialType(CreateItemVariationDto) {}
