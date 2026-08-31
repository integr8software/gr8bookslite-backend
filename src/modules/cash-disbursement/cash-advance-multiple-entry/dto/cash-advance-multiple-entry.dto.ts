import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashAdvanceStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { normalizeNumberStringInput } from '../../../../common/utils/dto-transform.util';

export class CashAdvanceMultipleEntryItemDto {
  @ApiPropertyOptional({ example: 'EMP-0017' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ example: 'EMP-0017' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ example: '50000.00' })
  @IsString()
  @IsOptional()
  cashAdvanceLimit?: string;

  @ApiPropertyOptional({ example: '12500.00' })
  @IsString()
  @IsOptional()
  cashAdvanceBalance?: string;

  @ApiPropertyOptional({ example: 'Travel advance' })
  @IsString()
  @IsOptional()
  particulars?: string;

  @ApiPropertyOptional({ example: 'Operations' })
  @IsString()
  @IsOptional()
  responsibilityCenter?: string;

  @ApiPropertyOptional({ example: '12500.00' })
  @Transform(({ value }) => normalizeNumberStringInput(value))
  @IsNumberString()
  @IsOptional()
  amount?: string;
}

export class CashAdvanceMultipleEntryAccountingEntryDto {
  @ApiPropertyOptional({ example: '5000' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ example: '1010103000' })
  @IsString()
  @IsOptional()
  accountCode?: string;

  @ApiPropertyOptional({ example: 'Cash Advance - Employees' })
  @IsString()
  @IsOptional()
  accountTitle?: string;

  @ApiPropertyOptional({ example: '12500.00' })
  @IsString()
  @IsOptional()
  debit?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsString()
  @IsOptional()
  credit?: string;

  @ApiPropertyOptional({ example: 'EMP-0017' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ example: 'Travel advance' })
  @IsString()
  @IsOptional()
  particulars?: string;

  @ApiPropertyOptional({ example: 'Operations' })
  @IsString()
  @IsOptional()
  responsibilityCenter?: string;

  @ApiPropertyOptional({ example: 'Travel advance' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateCashAdvanceMultipleEntryDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ example: '1010103000' })
  @IsString()
  @IsOptional()
  accountCode?: string;

  @ApiPropertyOptional({ example: 'Cash Advance - Employees' })
  @IsString()
  @IsOptional()
  accountTitle?: string;

  @ApiPropertyOptional({ example: 'PHP' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: '1.0000' })
  @IsString()
  @IsOptional()
  exchangeRate?: string;

  @ApiProperty({ example: '2026-08-28' })
  @IsDateString()
  @IsNotEmpty()
  documentDate: string;

  @ApiPropertyOptional({ example: 'CAME-2026-000001' })
  @IsString()
  @IsOptional()
  transNo?: string;

  @ApiPropertyOptional({ example: 'EMP-0017' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ example: 'Implementation Projects' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ example: 'IMPL-PROJ' })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiPropertyOptional({ description: 'Legacy alias for Project Name', example: 'Implementation Projects' })
  @IsString()
  @IsOptional()
  projectRef?: string;

  @ApiPropertyOptional({ example: 'Operations' })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiPropertyOptional({ example: 'Batch remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ enum: CashAdvanceStatus, example: CashAdvanceStatus.DRAFT })
  @IsEnum(CashAdvanceStatus)
  @IsOptional()
  status?: CashAdvanceStatus;

  @ApiPropertyOptional({ type: [CashAdvanceMultipleEntryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashAdvanceMultipleEntryItemDto)
  @IsOptional()
  items?: CashAdvanceMultipleEntryItemDto[];

  @ApiPropertyOptional({ type: [CashAdvanceMultipleEntryAccountingEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashAdvanceMultipleEntryAccountingEntryDto)
  @IsOptional()
  accountingEntries?: CashAdvanceMultipleEntryAccountingEntryDto[];
}

export class UpdateCashAdvanceMultipleEntryDto extends CreateCashAdvanceMultipleEntryDto {}

export class UpdateCashAdvanceMultipleEntryStatusDto {
  @ApiProperty({ enum: CashAdvanceStatus, example: CashAdvanceStatus.FOR_APPROVAL })
  @IsEnum(CashAdvanceStatus)
  @IsNotEmpty()
  status: CashAdvanceStatus;
}

export class GetCashAdvanceMultipleEntryListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search transaction no, party, account, or remarks' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'DRAFT, FOR_APPROVAL, APPROVED, POSTED, DISAPPROVED, or CANCELLED' })
  @IsOptional()
  @IsString()
  status?: string;
}
