import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdvanceToSupplierPaymentType, AdvanceToSupplierStatus } from '@prisma/client';

export class AdvanceToSupplierResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'ATS-2026-000001' })
  transactionNo: string;

  @ApiProperty({ example: '2026-08-17' })
  documentDate: string;

  @ApiPropertyOptional({ example: '17' })
  partyId?: string | null;

  @ApiProperty({ example: 'S000041' })
  partyCode: string;

  @ApiProperty({ example: 'Pacific Office Solutions, Inc.' })
  partyName: string;

  @ApiProperty({ example: '104-100' })
  accountCode: string;

  @ApiPropertyOptional({ example: 'Advances to Suppliers' })
  accountTitle?: string | null;

  @ApiPropertyOptional({ example: 'Purchasing' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ example: 'RC-PUR' })
  responsibilityCenterCode?: string | null;

  @ApiPropertyOptional({ example: 'Branch Expansion' })
  projectName?: string | null;

  @ApiPropertyOptional({ example: 'PRJ-002' })
  projectCode?: string | null;

  @ApiProperty({ example: 'PHP' })
  currency: string;

  @ApiProperty({ example: 1 })
  exchangeRate: number;

  @ApiProperty({ example: 'PO-2026-0817' })
  poReference: string;

  @ApiProperty({ example: 120000 })
  totalPoAmount: number;

  @ApiProperty({ enum: AdvanceToSupplierPaymentType, example: AdvanceToSupplierPaymentType.PERCENTAGE })
  advancePaymentType: AdvanceToSupplierPaymentType;

  @ApiProperty({ example: 30 })
  advancePaymentPercentage: number;

  @ApiProperty({ example: 36000 })
  amount: number;

  @ApiPropertyOptional({ example: 'Office equipment advance' })
  remarks?: string | null;

  @ApiProperty({ enum: AdvanceToSupplierStatus, example: AdvanceToSupplierStatus.DRAFT })
  status: AdvanceToSupplierStatus;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  createdBy?: string | null;

  @ApiProperty({ example: '2026-08-17T09:00:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  updatedBy?: string | null;

  @ApiPropertyOptional({ example: '2026-08-17T09:00:00.000Z' })
  updatedAt?: string | null;
}

export class AdvanceToSupplierListResponseDto {
  @ApiProperty({ type: [AdvanceToSupplierResponseDto] })
  items: AdvanceToSupplierResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
