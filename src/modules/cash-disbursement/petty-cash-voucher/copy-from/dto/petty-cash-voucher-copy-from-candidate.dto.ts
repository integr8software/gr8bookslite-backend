import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../common/dto/pagination-meta.dto';

export class PettyCashVoucherCopyFromCandidateDto {
  @ApiProperty({ description: 'Petty Cash Voucher ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Petty Cash Voucher transaction number', example: 'PCV-2026-000001' })
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

  @ApiProperty({ description: 'Gross amount already copied to active Petty Cash Replenishments', example: 3000 })
  consumedGrossAmount: number;

  @ApiProperty({ description: 'Remaining gross amount available to copy', example: 2000 })
  availableGrossAmount: number;

  @ApiProperty({ description: 'Original disburse amount', example: 4850 })
  disburseAmount: number;

  @ApiProperty({ description: 'Disburse amount already copied to active Petty Cash Replenishments', example: 2910 })
  consumedAmount: number;

  @ApiProperty({ description: 'Remaining disburse amount available to copy', example: 1940 })
  availableAmount: number;

  @ApiPropertyOptional({ description: 'Default account code', example: '1010101000' })
  accountCode?: string | null;

  @ApiPropertyOptional({ description: 'Default account title', example: 'Petty Cash Fund' })
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

  @ApiPropertyOptional({ description: 'Remarks', example: 'Office supplies expense' })
  remarks?: string | null;

  @ApiProperty({ description: 'Source module display name', example: 'Petty Cash Voucher' })
  source: string;

  @ApiProperty({ description: 'Source transaction number', example: 'PCV-2026-000001' })
  sourceNo: string;
}

export class PettyCashVoucherCopyFromCandidatesResponseDto {
  @ApiProperty({ description: 'Available PCV records', type: () => [PettyCashVoucherCopyFromCandidateDto] })
  records: PettyCashVoucherCopyFromCandidateDto[];

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Pagination metadata' })
  pagination: PaginationMetaDto;
}
