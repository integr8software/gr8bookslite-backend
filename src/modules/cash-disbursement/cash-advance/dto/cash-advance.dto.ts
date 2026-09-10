import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashAdvanceStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { normalizeNumberStringInput } from '../../../../common/utils/dto-transform.util';

export class CashAdvanceItemDto {
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

  @ApiPropertyOptional({ example: 'Remarks' })
  @IsString()
  @IsOptional()
  remarks?: string;

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

export class CashAdvanceAccountingEntryDto {
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

export class CreateCashAdvanceDto {
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

  @ApiPropertyOptional({ example: 'CA-2026-000001' })
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

  @ApiPropertyOptional({ type: () => [CashAdvanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashAdvanceItemDto)
  @IsOptional()
  items?: CashAdvanceItemDto[];

  @ApiPropertyOptional({ type: () => [CashAdvanceAccountingEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashAdvanceAccountingEntryDto)
  @IsOptional()
  accountingEntries?: CashAdvanceAccountingEntryDto[];
}

export class UpdateCashAdvanceDto extends CreateCashAdvanceDto {}

export class UpdateCashAdvanceStatusDto {
  @ApiProperty({ enum: CashAdvanceStatus, example: CashAdvanceStatus.FOR_APPROVAL })
  @IsEnum(CashAdvanceStatus)
  @IsNotEmpty()
  status: CashAdvanceStatus;
}

export class GetCashAdvanceListQueryDto {
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

  @ApiPropertyOptional({ description: 'DRAFT, FOR_APPROVAL, POSTED, DISAPPROVED, or CANCELLED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortOrder?: string;
}

export class CashAdvancePaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class CashAdvanceRecordResponseDto {
  @ApiProperty({ example: 'CA-2026-000001' })
  id: string;

  @ApiProperty({ example: 'CA-2026-000001' })
  transNo: string;

  @ApiProperty({ example: '2026-08-28' })
  documentDate: string;

  @ApiProperty({ example: 'EMP-0017' })
  partyCode: string;

  @ApiProperty({ example: 'Maria Santos' })
  partyName: string;

  @ApiPropertyOptional({ example: 'IMPL-PROJ' })
  projectCode?: string;

  @ApiPropertyOptional({ example: 'Implementation Projects' })
  projectName?: string;

  @ApiPropertyOptional({ example: 'Implementation Projects' })
  projectRef?: string;

  @ApiProperty({ example: '1010103000' })
  accountCode: string;

  @ApiProperty({ example: 'Cash Advance - Employees' })
  accountTitle: string;

  @ApiProperty({ example: 'Operations' })
  costCenter: string;

  @ApiPropertyOptional({ example: 'PHP' })
  currency?: string;

  @ApiPropertyOptional({ example: '1.0000' })
  exchangeRate?: string | number;

  @ApiProperty({ example: 12500.0 })
  amount: number;

  @ApiProperty({ example: 'Batch remarks' })
  remarks: string;

  @ApiProperty({ enum: CashAdvanceStatus, example: CashAdvanceStatus.DRAFT })
  status: CashAdvanceStatus;

  @ApiPropertyOptional({ type: () => CreateCashAdvanceDto })
  formValues?: CreateCashAdvanceDto;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiPropertyOptional()
  updatedBy?: string;
}

export class CashAdvanceListResponseDto {
  @ApiProperty({ type: () => [CashAdvanceRecordResponseDto] })
  data: CashAdvanceRecordResponseDto[];

  @ApiProperty({ type: () => CashAdvancePaginationMetaDto })
  meta: CashAdvancePaginationMetaDto;
}

export class CashAdvanceSingleResponseDto {
  @ApiProperty({ type: () => CashAdvanceRecordResponseDto })
  data: CashAdvanceRecordResponseDto;
}
