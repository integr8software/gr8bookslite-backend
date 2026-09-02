import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PettyCashVoucherStatus } from '@prisma/client';

export class PettyCashVoucherResponseDto {
  @ApiProperty({ description: 'ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Company ID', example: 1 })
  companyId: number;

  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  branchUnitId?: number | null;

  @ApiProperty({ description: 'Voucher Number', example: 'PCV-2026-000001' })
  voucherNo: string;

  @ApiProperty({ description: 'Transaction Number alias', example: 'PCV-2026-000001' })
  transactionNo: string;

  @ApiProperty({ description: 'Document Date', example: '2026-05-21' })
  documentDate: string;

  @ApiPropertyOptional({ description: 'Party ID', example: '1' })
  partyId?: string | null;

  @ApiProperty({ description: 'Party Code Snapshot', example: 'PTY-001' })
  partyCodeSnapshot: string;

  @ApiProperty({ description: 'Party Name Snapshot', example: 'Acme Corp' })
  partyNameSnapshot: string;

  @ApiPropertyOptional({ description: 'Party Code alias', example: 'PTY-001' })
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party Name alias', example: 'Acme Corp' })
  partyName?: string;

  @ApiPropertyOptional({ description: 'Default Account / Credit Account ID', example: '1' })
  creditAccountId?: string | null;

  @ApiPropertyOptional({ description: 'Default Account ID alias', example: '1' })
  accountId?: string | null;

  @ApiProperty({ description: 'Account Code Snapshot', example: '1010101000' })
  accountCodeSnapshot: string;

  @ApiPropertyOptional({ description: 'Account Title Snapshot', example: 'Petty Cash Fund' })
  accountTitleSnapshot?: string | null;

  @ApiPropertyOptional({ description: 'Default Account Code alias', example: '1010101000' })
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Default Account Title alias', example: 'Petty Cash Fund' })
  accountTitle?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center Code Snapshot', example: 'RC-001' })
  responsibilityCenterCodeSnapshot?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center Snapshot', example: 'Operations' })
  responsibilityCenterSnapshot?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center Code alias', example: 'RC-001' })
  responsibilityCenterCode?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center Name alias', example: 'Operations' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-001' })
  projectCode?: string | null;

  @ApiPropertyOptional({ description: 'Project Name', example: 'Headquarters Renovation' })
  projectName?: string | null;

  @ApiProperty({ description: 'Currency Code', example: 'PHP' })
  currencyCode: string;

  @ApiPropertyOptional({ description: 'Currency Code alias', example: 'PHP' })
  currency?: string;

  @ApiProperty({ description: 'Exchange Rate', example: 1.0 })
  exchangeRate: number;

  @ApiProperty({ description: 'Amount', example: 5000.0 })
  amount: number;

  @ApiProperty({ description: 'Gross Amount', example: 5000.0 })
  grossAmount: number;

  @ApiProperty({ description: 'Net Amount', example: 4500.0 })
  netAmount: number;

  @ApiPropertyOptional({ description: 'VAT Type', example: 'VAT Inclusive' })
  vatType?: string | null;

  @ApiPropertyOptional({ description: 'VATable flag', example: 'True' })
  vatable?: string | null;

  @ApiPropertyOptional({ description: 'VAT Rate Description', example: '12%' })
  vatRate?: string | null;

  @ApiProperty({ description: 'VAT Percent', example: 12.0 })
  vatPercent: number;

  @ApiProperty({ description: 'VAT Amount', example: 600.0 })
  vatAmount: number;

  @ApiPropertyOptional({ description: 'EWT Code', example: 'WC100' })
  ewtCode?: string | null;

  @ApiPropertyOptional({ description: 'EWT Rate Description', example: '2%' })
  ewtRate?: string | null;

  @ApiProperty({ description: 'EWT Percent', example: 2.0 })
  ewtPercent: number;

  @ApiProperty({ description: 'EWT Amount', example: 100.0 })
  ewtAmount: number;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Office supplies expense' })
  remarks?: string | null;

  @ApiProperty({ description: 'Status', enum: PettyCashVoucherStatus, example: PettyCashVoucherStatus.DRAFT })
  status: PettyCashVoucherStatus;

  @ApiProperty({ description: 'Created At', example: '2026-05-21T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Updated At', example: '2026-05-21T08:00:00.000Z' })
  updatedAt: string;
}

export class PettyCashVoucherPaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total item count', example: 42 })
  total: number;

  @ApiProperty({ description: 'Total pages count', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Has next page', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Has previous page', example: false })
  hasPreviousPage: boolean;
}

export class PettyCashVoucherListResponseDto {
  @ApiProperty({ type: [PettyCashVoucherResponseDto] })
  items: PettyCashVoucherResponseDto[];

  @ApiProperty({ type: PettyCashVoucherPaginationMetaDto })
  meta: PettyCashVoucherPaginationMetaDto;
}
