import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PettyCashFundStatus } from '@prisma/client';
import { PettyCashFundDetailDto } from './petty-cash-fund-detail.dto';

export class CreatePettyCashFundDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Transaction Number', example: 'PCF-2026-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  transactionNo?: string;

  @ApiProperty({ description: 'Document Date', example: '2026-05-21' })
  @IsDateString()
  documentDate: string;

  @ApiPropertyOptional({ description: 'Party ID (Custodian / Employee)', example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Party Code', example: 'EMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party Name (Custodian)', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  @IsOptional()
  @IsString()
  responsibilityCenterId?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Code', example: 'RC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibilityCenterCode?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Name', example: 'Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectCode?: string;

  @ApiPropertyOptional({ description: 'Project Name', example: 'Headquarters Renovation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string;

  @ApiPropertyOptional({ description: 'Credit Account ID / Default Account ID', example: '1' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Credit Account ID', example: '1' })
  @IsOptional()
  @IsString()
  creditAccountId?: string;

  @ApiPropertyOptional({ description: 'Account Code Snapshot', example: '1010101000' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Account Title Snapshot', example: 'Petty Cash Fund' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountTitle?: string;

  @ApiPropertyOptional({ description: 'Currency code', default: 'PHP', example: 'PHP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Currency alias', default: 'PHP', example: 'PHP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange Rate', default: 1.0, example: 1.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Total Amount', default: 0, example: 10000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Petty cash fund establishment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiPropertyOptional({
    description: 'Initial Status',
    enum: PettyCashFundStatus,
    default: PettyCashFundStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PettyCashFundStatus)
  status?: PettyCashFundStatus;

  @ApiPropertyOptional({
    description: 'Petty Cash Fund Details',
    type: [PettyCashFundDetailDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PettyCashFundDetailDto)
  details?: PettyCashFundDetailDto[];
}
