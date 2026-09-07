import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toOptionalInt } from '../../../../../common/utils/dto-transform.util';

const TargetVoucherValues = ['cash-voucher', 'disbursement-voucher'] as const;

export type AccountsPayableVoucherCopyFromTarget = (typeof TargetVoucherValues)[number];

export class GetAccountsPayableVoucherCopyFromCandidatesQueryDto {
  @IsIn(TargetVoucherValues)
  target: AccountsPayableVoucherCopyFromTarget;

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
  @IsString()
  @MaxLength(40)
  partyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string;

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
}
