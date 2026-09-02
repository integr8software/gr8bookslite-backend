import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PettyCashFundStatus } from '@prisma/client';
import { PettyCashFundDetailDto } from './petty-cash-fund-detail.dto';

export class PettyCashFundResponseDto {
  @ApiProperty({ description: 'ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Company ID', example: 1 })
  companyId: number;

  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  branchUnitId?: number | null;

  @ApiProperty({ description: 'Transaction Number', example: 'PCF-2026-000001' })
  transactionNo: string;

  @ApiProperty({ description: 'Document Date', example: '2026-05-21' })
  documentDate: string;

  @ApiPropertyOptional({ description: 'Party ID', example: '1' })
  partyId?: string | null;

  @ApiProperty({ description: 'Party Code Snapshot', example: 'EMP-001' })
  partyCodeSnapshot: string;

  @ApiProperty({ description: 'Party Name Snapshot', example: 'John Doe' })
  partyNameSnapshot: string;

  @ApiPropertyOptional({ description: 'Party Code alias', example: 'EMP-001' })
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party Name alias', example: 'John Doe' })
  partyName?: string;

  @ApiPropertyOptional({ description: 'Credit Account ID / Default Account ID', example: '1' })
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

  @ApiProperty({ description: 'Amount', example: 10000.0 })
  amount: number;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Petty cash fund establishment' })
  remarks?: string | null;

  @ApiProperty({ description: 'Status', enum: PettyCashFundStatus, example: PettyCashFundStatus.DRAFT })
  status: PettyCashFundStatus;

  @ApiPropertyOptional({ description: 'Fund Details', type: [PettyCashFundDetailDto] })
  details?: PettyCashFundDetailDto[];

  @ApiProperty({ description: 'Created At', example: '2026-05-21T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Updated At', example: '2026-05-21T08:00:00.000Z' })
  updatedAt: string;
}

export class PettyCashFundPaginationMetaDto {
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

export class PettyCashFundListResponseDto {
  @ApiProperty({ type: [PettyCashFundResponseDto] })
  items: PettyCashFundResponseDto[];

  @ApiProperty({ type: PettyCashFundPaginationMetaDto })
  meta: PettyCashFundPaginationMetaDto;
}
