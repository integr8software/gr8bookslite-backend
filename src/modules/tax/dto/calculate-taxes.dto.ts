import { TaxPostingEvent, TaxTransactionScope } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CalculateTaxItemDto {
  @IsString()
  @IsNotEmpty()
  taxId!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxableAmount!: number;
}

export class CalculateTaxesDto {
  @IsDateString()
  transactionDate!: string;

  @IsEnum(TaxTransactionScope)
  transactionScope!: Exclude<TaxTransactionScope, 'BOTH'>;

  @IsOptional()
  @IsEnum(TaxPostingEvent)
  postingEvent?: TaxPostingEvent;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  currencyScale?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CalculateTaxItemDto)
  taxes!: CalculateTaxItemDto[];
}
