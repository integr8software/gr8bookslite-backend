import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdvanceToSupplierPaymentType, AdvanceToSupplierStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateAdvanceToSupplierDto {
  @ApiPropertyOptional({ description: 'Party primary key ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiProperty({ description: 'Supplier party code', example: 'S000041' })
  @IsString()
  @IsNotEmpty()
  partyCode: string;

  @ApiProperty({ description: 'Supplier party name', example: 'Pacific Office Solutions, Inc.' })
  @IsString()
  @IsNotEmpty()
  partyName: string;

  @ApiPropertyOptional({ description: 'Chart account primary key ID', example: '1' })
  @IsString()
  @IsOptional()
  creditAccountId?: string;

  @ApiProperty({ description: 'Default account code', example: '104-100' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

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

  @ApiProperty({ description: 'Currency code', example: 'PHP' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ description: 'Exchange rate', example: '1.0000' })
  @IsString()
  @IsNotEmpty()
  exchangeRate: string;

  @ApiProperty({ description: 'Purchase order reference', example: 'PO-2026-0817' })
  @IsString()
  @IsNotEmpty()
  poReference: string;

  @ApiProperty({ description: 'Purchase order total amount', example: '120000.00' })
  @IsNumberString()
  @IsNotEmpty()
  totalPoAmount: string;

  @ApiProperty({ enum: AdvanceToSupplierPaymentType, example: AdvanceToSupplierPaymentType.PERCENTAGE })
  @IsEnum(AdvanceToSupplierPaymentType)
  @IsNotEmpty()
  advancePaymentType: AdvanceToSupplierPaymentType;

  @ApiProperty({ description: 'Advance payment percentage', example: '30.00' })
  @IsNumberString()
  @IsNotEmpty()
  advancePaymentPercentage: string;

  @ApiProperty({ description: 'Advance payment amount', example: '36000.00' })
  @IsNumberString()
  @IsNotEmpty()
  advancePaymentAmount: string;

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
