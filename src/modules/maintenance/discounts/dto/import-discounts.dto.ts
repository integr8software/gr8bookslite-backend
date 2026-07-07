import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateDiscountDto } from './create-discount.dto';

export class ImportDiscountsDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateDiscountDto)
  discounts!: CreateDiscountDto[];
}
