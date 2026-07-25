import { TaxAmountSource, TaxEntrySide, TaxPostingEvent, TaxTransactionScope } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateTaxPostingRuleDto {
  @IsEnum(TaxTransactionScope)
  transactionScope!: Exclude<TaxTransactionScope, 'BOTH'>;

  @IsOptional()
  @IsEnum(TaxPostingEvent)
  postingEvent?: TaxPostingEvent;

  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MaxLength(100)
  accountRole!: string;

  @IsEnum(TaxEntrySide)
  entrySide!: TaxEntrySide;

  @IsOptional()
  @IsEnum(TaxAmountSource)
  amountSource?: TaxAmountSource;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
