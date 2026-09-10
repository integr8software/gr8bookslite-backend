import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../../common/dto/pagination-meta.dto';

export class AdvanceToSupplierCopyFromCandidateDetailDto {
  @ApiProperty({ example: 'ATS-2026-000001' })
  id: string;

  @ApiProperty({ example: 1 })
  lineNumber: number;

  @ApiPropertyOptional({ example: '104-100' })
  accountCode?: string | null;

  @ApiPropertyOptional({ example: 'Advances to Suppliers' })
  accountTitle?: string | null;

  @ApiProperty({ example: 30000 })
  grossAmount: number;

  @ApiProperty({ example: 30000 })
  amount: number;

  @ApiProperty({ example: 30000 })
  consumptionAmount: number;

  @ApiPropertyOptional({ example: 'Supplier advance for PO-2026-000001' })
  particulars?: string | null;

  @ApiPropertyOptional({ example: 'Purchasing' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ example: 'PO:PO-2026-000001' })
  referenceNo?: string | null;
}

export class AdvanceToSupplierCopyFromCandidateDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Advances to Suppliers' })
  source: string;

  @ApiProperty({ example: 'ATS-2026-000001' })
  sourceNo: string;

  @ApiProperty({ example: 'ATS-2026-000001' })
  transactionNo: string;

  @ApiProperty({ example: '2026-09-08' })
  documentDate: string;

  @ApiPropertyOptional({ example: 1 })
  branchUnitId?: number | null;

  @ApiPropertyOptional({ example: '1' })
  partyId?: string | null;

  @ApiProperty({ example: 'SUP-0001' })
  partyCode: string;

  @ApiProperty({ example: 'ABC Supplier' })
  partyName: string;

  @ApiProperty({ example: 'PHP' })
  currency: string;

  @ApiProperty({ example: 1 })
  exchangeRate: number;

  @ApiProperty({ example: 30000 })
  grossAmount: number;

  @ApiProperty({ example: 5000 })
  consumedGrossAmount: number;

  @ApiProperty({ example: 25000 })
  availableGrossAmount: number;

  @ApiProperty({ example: 30000 })
  amount: number;

  @ApiProperty({ example: 5000 })
  consumedAmount: number;

  @ApiProperty({ example: 25000 })
  availableAmount: number;

  @ApiPropertyOptional({ example: 'PO:PO-2026-000001' })
  poReference?: string | null;

  @ApiPropertyOptional({ example: 'PRJ-001' })
  projectCode?: string | null;

  @ApiPropertyOptional({ example: 'Branch Renovation' })
  projectName?: string | null;

  @ApiPropertyOptional({ example: 'Supplier advance' })
  remarks?: string | null;

  @ApiProperty({ type: () => [AdvanceToSupplierCopyFromCandidateDetailDto] })
  details: AdvanceToSupplierCopyFromCandidateDetailDto[];
}

export class AdvanceToSupplierCopyFromCandidatesResponseDto {
  @ApiProperty({ type: () => [AdvanceToSupplierCopyFromCandidateDto] })
  records: AdvanceToSupplierCopyFromCandidateDto[];

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Pagination metadata' })
  pagination: PaginationMetaDto;
}
