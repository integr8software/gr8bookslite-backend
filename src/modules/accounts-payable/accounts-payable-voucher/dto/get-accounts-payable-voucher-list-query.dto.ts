import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export const AccountsPayableVoucherStatusInputValues = [
  'DRAFT',
  'FOR_APPROVAL',
  'APPROVED',
  'POSTED',
  'DISAPPROVED',
  'CLOSED',
  'CANCELLED',
  'Draft',
  'For Approval',
  'Approved',
  'Posted',
  'Disapproved',
  'Closed',
  'Cancelled',
] as const;

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

export class GetAccountsPayableVoucherListQueryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ enum: AccountsPayableVoucherStatusInputValues })
  @IsOptional()
  @IsIn(AccountsPayableVoucherStatusInputValues)
  status?: (typeof AccountsPayableVoucherStatusInputValues)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  documentDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  documentDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  amountFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  amountTo?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ maximum: 500, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ enum: ['transactionNo', 'documentDate', 'partyName', 'payableType', 'amount', 'currency', 'status', 'createdAt', 'updatedAt'] })
  @IsOptional()
  @IsIn(['transactionNo', 'documentDate', 'partyName', 'payableType', 'amount', 'currency', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'transactionNo' | 'documentDate' | 'partyName' | 'payableType' | 'amount' | 'currency' | 'status' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
