import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export const JournalVoucherStatusInputValues = ['DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED'] as const;

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export class GetJournalVoucherListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @IsOptional()
  @IsIn(JournalVoucherStatusInputValues)
  status?: (typeof JournalVoucherStatusInputValues)[number];

  @IsOptional()
  @IsDateString()
  documentDateFrom?: string;

  @IsOptional()
  @IsDateString()
  documentDateTo?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  amountFrom?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  amountTo?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsIn(['transactionNo', 'documentDate', 'totalDebit', 'totalCredit', 'currencyCode', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'transactionNo' | 'documentDate' | 'totalDebit' | 'totalCredit' | 'currencyCode' | 'status' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
