import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateTermDto } from './create-term.dto';

export class ImportTermsDto {
  @ApiProperty({ type: [CreateTermDto], minItems: 1, maxItems: 500 })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateTermDto)
  terms!: CreateTermDto[];
}
