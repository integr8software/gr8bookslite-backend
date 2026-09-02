import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Min } from 'class-validator';
import { normalizeNumberStringInput } from '../../../../common/utils/dto-transform.util';

export class CreateCashAdvanceDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Party Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Party Code (Employee/Vendor)', example: 'EMP-0017' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party Name', example: 'Maria Santos' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ description: 'Chart Account Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  creditAccountId?: string;

  @ApiPropertyOptional({ description: 'Default Account Code', example: '1010103000' })
  @IsString()
  @IsOptional()
  accountCode?: string;

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

  @ApiPropertyOptional({ description: 'Project Name', example: 'Implementation Projects' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-01' })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiPropertyOptional({ description: 'Legacy alias for Project Name', example: 'Implementation Projects' })
  @IsString()
  @IsOptional()
  projectRef?: string;

  @ApiPropertyOptional({ description: 'Currency Code', example: 'PHP', default: 'PHP' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange Rate', example: '1.0000', default: '1.0000' })
  @IsString()
  @IsOptional()
  fxRate?: string;

  @ApiPropertyOptional({ description: 'Cash Advance Amount', example: '12500.00' })
  @Transform(({ value }) => normalizeNumberStringInput(value))
  @IsNumberString()
  @IsOptional()
  amount?: string;

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
