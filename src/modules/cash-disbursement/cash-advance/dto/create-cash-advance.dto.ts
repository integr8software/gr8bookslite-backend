import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateCashAdvanceDto {
  @ApiPropertyOptional({ description: 'Party Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiProperty({ description: 'Party Code (Employee/Vendor)', example: 'EMP-0017' })
  @IsString()
  @IsNotEmpty()
  partyCode: string;

  @ApiProperty({ description: 'Party Name', example: 'Maria Santos' })
  @IsString()
  @IsNotEmpty()
  partyName: string;

  @ApiPropertyOptional({ description: 'Chart Account Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  creditAccountId?: string;

  @ApiProperty({ description: 'Default Account Code', example: '1010103000' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiPropertyOptional({ description: 'Default Account Title', example: 'Accounts Receivable - Trade' })
  @IsString()
  @IsOptional()
  accountTitle?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Name', example: 'Finance and Administration' })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Code', example: 'FA-01' })
  @IsString()
  @IsOptional()
  costCenterCode?: string;

  @ApiPropertyOptional({ description: 'Project Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Project Reference / Name', example: 'Implementation Projects' })
  @IsString()
  @IsOptional()
  projectRef?: string;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-01' })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiProperty({ description: 'Currency Code', example: 'PHP', default: 'PHP' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ description: 'Exchange Rate', example: '1.0000', default: '1.0000' })
  @IsString()
  @IsNotEmpty()
  fxRate: string;

  @ApiProperty({ description: 'Cash Advance Amount', example: '12500.00' })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ description: 'Document Date in YYYY-MM-DD format', example: '2026-06-11' })
  @IsDateString()
  @IsNotEmpty()
  documentDate: string;

  @ApiPropertyOptional({ description: 'Custom Transaction Sequence No', example: 'CA-2026-000001' })
  @IsString()
  @IsOptional()
  transNo?: string;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Travel allowance advance' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
