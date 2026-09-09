import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toOptionalInt } from '../../../../../common/utils/dto-transform.util';

const TargetVoucherValues = ['official-receipt', 'acknowledgement-receipt', 'accounts-payable-voucher', 'cash-voucher', 'disbursement-voucher'] as const;

export type JournalVoucherCopyFromTarget = (typeof TargetVoucherValues)[number];

export class GetJournalVoucherCopyFromCandidatesQueryDto {
  @IsIn(TargetVoucherValues)
  target: JournalVoucherCopyFromTarget;

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
  @MaxLength(80)
  partyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  partyName?: string;

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
