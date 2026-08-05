import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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
  @IsIn(AccountsPayableVoucherStatusInputValues)
  status?: (typeof AccountsPayableVoucherStatusInputValues)[number];

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
  @IsIn(['transactionNo', 'documentDate', 'partyName', 'payableType', 'amount', 'currency', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'transactionNo' | 'documentDate' | 'partyName' | 'payableType' | 'amount' | 'currency' | 'status' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
