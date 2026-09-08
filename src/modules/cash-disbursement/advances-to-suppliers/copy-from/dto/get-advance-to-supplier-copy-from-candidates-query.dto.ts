import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const TargetVoucherValues = ['cash-voucher', 'disbursement-voucher'] as const;
export type AdvanceToSupplierCopyFromTarget = (typeof TargetVoucherValues)[number];

export class GetAdvanceToSupplierCopyFromCandidatesQueryDto {
  @ApiProperty({ enum: TargetVoucherValues, example: 'cash-voucher' })
  @IsIn(TargetVoucherValues)
  target: AdvanceToSupplierCopyFromTarget;

  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Supplier party primary key ID', example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Supplier party code', example: 'SUP-0001' })
  @IsOptional()
  @IsString()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Search by ATS number, PO reference, supplier, project, or remarks' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
