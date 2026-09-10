import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { toOptionalInt } from '../../../../../common/utils/dto-transform.util';

const TargetVoucherValues = ['official-receipt', 'acknowledgement-receipt', 'accounts-payable-voucher', 'cash-voucher', 'disbursement-voucher'] as const;

export type JournalVoucherCopyFromTarget = (typeof TargetVoucherValues)[number];

export class GetJournalVoucherCopyFromCandidatesQueryDto {
  @ApiProperty({ description: 'Target module that will consume the Journal Voucher line balance', enum: TargetVoucherValues, example: 'cash-voucher' })
  @IsIn(TargetVoucherValues)
  target: JournalVoucherCopyFromTarget;

  @ApiPropertyOptional({ description: 'Search across JV number, account, party, or particulars', maxLength: 120, example: 'JV-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Branch unit ID filter', minimum: 1, example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Party code filter', maxLength: 80, example: 'EMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party name filter', maxLength: 160, example: 'Juan Dela Cruz' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  partyName?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 500, default: 50, example: 10 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
