import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../common/dto/pagination-meta.dto';

export class RevolvingFundCopyFromCandidateDetailDto {
  @ApiProperty({ description: 'Revolving Fund detail line ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Source line number', example: 1 })
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Revolving fund line date', example: '2026-09-07' })
  date?: string | null;

  @ApiPropertyOptional({ description: 'Supplier code snapshot', example: 'SUP-001' })
  supplierCode?: string | null;

  @ApiPropertyOptional({ description: 'Supplier name snapshot', example: 'Anna Supplies' })
  supplierName?: string | null;

  @ApiProperty({ description: 'Gross amount', example: 5000 })
  grossAmount: number;

  @ApiProperty({ description: 'Net amount', example: 4400 })
  netAmount: number;

  @ApiPropertyOptional({ description: 'VAT type/code', example: 'Input VAT' })
  vatType?: string | null;

  @ApiProperty({ description: 'VAT percent', example: 12 })
  vatPercent: number;

  @ApiProperty({ description: 'VAT amount', example: 600 })
  vatAmount: number;

  @ApiPropertyOptional({ description: 'EWT code', example: 'WC100' })
  ewtCode?: string | null;

  @ApiProperty({ description: 'EWT percent', example: 2 })
  ewtPercent: number;

  @ApiProperty({ description: 'EWT amount', example: 100 })
  ewtAmount: number;

  @ApiProperty({ description: 'Disburse amount', example: 4900 })
  disburseAmount: number;

  @ApiPropertyOptional({ description: 'Particulars', example: 'Office supplies' })
  particulars?: string | null;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Receipt A' })
  remarks?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center ID', example: '1' })
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center code', example: 'RC-001' })
  responsibilityCenterCode?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center name', example: 'Admin Dept' })
  responsibilityCenter?: string | null;
}

export class RevolvingFundCopyFromCandidateDto {
  @ApiProperty({ description: 'Revolving Fund ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Revolving Fund transaction number', example: 'RF-2026-000001' })
  transactionNo: string;

  @ApiProperty({ description: 'Document date in YYYY-MM-DD format', example: '2026-09-07' })
  documentDate: string;

  @ApiPropertyOptional({ description: 'Party primary key ID', example: '1' })
  partyId?: string | null;

  @ApiProperty({ description: 'Party code snapshot', example: 'EMP-001' })
  partyCode: string;

  @ApiProperty({ description: 'Party name snapshot', example: 'John Doe' })
  partyName: string;

  @ApiProperty({ description: 'Currency code', example: 'PHP' })
  currency: string;

  @ApiProperty({ description: 'Exchange rate', example: 1 })
  exchangeRate: number;

  @ApiProperty({ description: 'Original gross amount', example: 5000 })
  amount: number;

  @ApiProperty({ description: 'Gross amount already copied to active Revolving Fund Replenishments', example: 3000 })
  consumedGrossAmount: number;

  @ApiProperty({ description: 'Remaining gross amount available to copy', example: 2000 })
  availableGrossAmount: number;

  @ApiProperty({ description: 'Original disburse amount', example: 4850 })
  disburseAmount: number;

  @ApiProperty({ description: 'Disburse amount already copied to active Revolving Fund Replenishments', example: 2910 })
  consumedAmount: number;

  @ApiProperty({ description: 'Remaining disburse amount available to copy', example: 1940 })
  availableAmount: number;

  @ApiPropertyOptional({ description: 'Default account code', example: '1010102000' })
  accountCode?: string | null;

  @ApiPropertyOptional({ description: 'Default account title', example: 'Revolving Fund' })
  accountTitle?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center ID', example: '1' })
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center code', example: 'RC-001' })
  responsibilityCenterCode?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center name', example: 'Admin Dept' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ description: 'Project code', example: 'PRJ-01' })
  projectCode?: string | null;

  @ApiPropertyOptional({ description: 'Project name', example: 'Main Office Expansion' })
  projectName?: string | null;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Initial fund' })
  remarks?: string | null;

  @ApiProperty({ description: 'RF detail lines to copy into Revolving Fund Replenishment', type: () => [RevolvingFundCopyFromCandidateDetailDto] })
  details: RevolvingFundCopyFromCandidateDetailDto[];

  @ApiProperty({ description: 'Source module display name', example: 'Revolving Fund' })
  source: string;

  @ApiProperty({ description: 'Source transaction number', example: 'RF-2026-000001' })
  sourceNo: string;
}

export class RevolvingFundCopyFromCandidatesResponseDto {
  @ApiProperty({ description: 'Available RF records', type: () => [RevolvingFundCopyFromCandidateDto] })
  records: RevolvingFundCopyFromCandidateDto[];

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Pagination metadata' })
  pagination: PaginationMetaDto;
}
