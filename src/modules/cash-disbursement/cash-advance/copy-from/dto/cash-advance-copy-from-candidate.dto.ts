import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../common/dto/pagination-meta.dto';

export class CashAdvanceCopyFromCandidateDetailDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 1 })
  lineNumber: number;

  @ApiPropertyOptional({ example: '1130-CA' })
  accountCode?: string | null;

  @ApiPropertyOptional({ example: 'Cash Advance - Employees' })
  accountTitle?: string | null;

  @ApiProperty({ example: 2500 })
  amount: number;

  @ApiProperty({ example: 2500 })
  grossAmount: number;

  @ApiProperty({ example: 2500 })
  consumptionAmount: number;

  @ApiPropertyOptional({ example: 'Travel advance' })
  particulars?: string | null;

  @ApiPropertyOptional({ example: 'Operations' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ example: 'CA:CA-2026-000001' })
  referenceNo?: string | null;
}

export class CashAdvanceCopyFromCandidateDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Employee Advance' })
  source: string;

  @ApiProperty({ example: 'CA-2026-000001' })
  sourceNo: string;

  @ApiProperty({ example: 'CA-2026-000001' })
  transactionNo: string;

  @ApiProperty({ example: '2026-09-09' })
  documentDate: string;

  @ApiPropertyOptional({ example: 12 })
  branchUnitId?: number | null;

  @ApiPropertyOptional({ example: '17' })
  partyId?: string | null;

  @ApiProperty({ example: 'EMP-001' })
  partyCode: string;

  @ApiProperty({ example: 'Juan Dela Cruz' })
  partyName: string;

  @ApiProperty({ example: 'PHP' })
  currency: string;

  @ApiProperty({ example: 1 })
  exchangeRate: number;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 2000 })
  consumedAmount: number;

  @ApiProperty({ example: 3000 })
  availableAmount: number;

  @ApiProperty({ example: 5000 })
  grossAmount: number;

  @ApiProperty({ example: 2000 })
  consumedGrossAmount: number;

  @ApiProperty({ example: 3000 })
  availableGrossAmount: number;

  @ApiPropertyOptional({ example: 'CC-001' })
  projectCode?: string | null;

  @ApiPropertyOptional({ example: 'Operations' })
  projectName?: string | null;

  @ApiPropertyOptional({ example: 'Travel advance' })
  remarks?: string | null;

  @ApiProperty({ example: 'CA' })
  referencePrefix: string;

  @ApiProperty({ type: () => [CashAdvanceCopyFromCandidateDetailDto] })
  details: CashAdvanceCopyFromCandidateDetailDto[];
}

export class CashAdvanceCopyFromCandidatesResponseDto {
  @ApiProperty({ type: () => [CashAdvanceCopyFromCandidateDto] })
  records: CashAdvanceCopyFromCandidateDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination: PaginationMetaDto;
}
