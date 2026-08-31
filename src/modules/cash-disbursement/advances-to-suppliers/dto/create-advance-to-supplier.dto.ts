import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdvanceToSupplierPaymentType, AdvanceToSupplierStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Min } from 'class-validator';
import { normalizeNumberStringInput } from '../../../../common/utils/dto-transform.util';

export class CreateAdvanceToSupplierDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Party primary key ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Supplier party code', example: 'S000041' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Supplier party name', example: 'Pacific Office Solutions, Inc.' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ description: 'Chart account primary key ID', example: '1' })
  @IsString()
  @IsOptional()
  creditAccountId?: string;

  @ApiPropertyOptional({ description: 'Default account code', example: '104-100' })
  @IsString()
  @IsOptional()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Default account title', example: 'Advances to Suppliers' })
  @IsString()
  @IsOptional()
  accountTitle?: string;

  @ApiPropertyOptional({ description: 'Responsibility center name', example: 'Purchasing' })
  @IsString()
  @IsOptional()
  responsibilityCenter?: string;

  @ApiPropertyOptional({ description: 'Responsibility center code', example: 'RC-PUR' })
  @IsString()
  @IsOptional()
  responsibilityCenterCode?: string;

  @ApiPropertyOptional({ description: 'Project name', example: 'Branch Expansion' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Project code', example: 'PRJ-002' })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'PHP' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange rate', example: '1.0000' })
  @IsString()
  @IsOptional()
  exchangeRate?: string;

  @ApiPropertyOptional({ description: 'Purchase order reference', example: 'PO-2026-0817' })
  @IsString()
  @IsOptional()
  poReference?: string;

  @ApiPropertyOptional({ description: 'Purchase order total amount', example: '120000.00' })
  @Transform(({ value }) => normalizeNumberStringInput(value))
  @IsNumberString()
  @IsOptional()
  totalPoAmount?: string;

  @ApiPropertyOptional({ enum: AdvanceToSupplierPaymentType, example: AdvanceToSupplierPaymentType.PERCENTAGE })
  @IsEnum(AdvanceToSupplierPaymentType)
  @IsOptional()
  advancePaymentType?: AdvanceToSupplierPaymentType;

  @ApiPropertyOptional({ description: 'Advance payment percentage', example: '30.00' })
  @Transform(({ value }) => normalizeNumberStringInput(value))
  @IsNumberString()
  @IsOptional()
  advancePaymentPercentage?: string;

  @ApiPropertyOptional({ description: 'Advance payment amount', example: '36000.00' })
  @Transform(({ value }) => normalizeNumberStringInput(value))
  @IsNumberString()
  @IsOptional()
  advancePaymentAmount?: string;

  @ApiProperty({ description: 'Document date in YYYY-MM-DD format', example: '2026-08-17' })
  @IsDateString()
  @IsNotEmpty()
  documentDate: string;

  @ApiPropertyOptional({ description: 'Custom ATS transaction number', example: 'ATS-2026-000001' })
  @IsString()
  @IsOptional()
  transactionNo?: string;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Office equipment advance' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ enum: AdvanceToSupplierStatus, example: AdvanceToSupplierStatus.DRAFT })
  @IsEnum(AdvanceToSupplierStatus)
  @IsOptional()
  status?: AdvanceToSupplierStatus;
}
