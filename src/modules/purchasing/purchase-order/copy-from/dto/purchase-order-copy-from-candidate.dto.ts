import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseOrderCopyFromCandidateDetailDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 1 })
  lineNumber: number;

  @ApiPropertyOptional({ example: 'ITM-0001' })
  itemId?: string | null;

  @ApiPropertyOptional({ example: 'ITEM-001' })
  itemCode?: string | null;

  @ApiProperty({ example: 'Office chairs' })
  description: string;

  @ApiPropertyOptional({ example: 'PCS' })
  uom?: string | null;

  @ApiProperty({ example: 10 })
  quantity: number;

  @ApiProperty({ example: 1500 })
  price: number;

  @ApiProperty({ example: 15000 })
  grossAmount: number;

  @ApiProperty({ example: 15000 })
  amount: number;

  @ApiPropertyOptional({ example: 'Administration' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ example: '1' })
  responsibilityCenterId?: string | null;
}

export class PurchaseOrderCopyFromCandidateDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Purchase Order' })
  source: string;

  @ApiProperty({ example: 'PO-2026-000001' })
  sourceNo: string;

  @ApiProperty({ example: 'PO-2026-000001' })
  transactionNo: string;

  @ApiProperty({ example: '2026-09-08' })
  documentDate: string;

  @ApiProperty({ example: 1 })
  branchUnitId: number;

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

  @ApiProperty({ example: 50000 })
  grossAmount: number;

  @ApiProperty({ example: 15000 })
  consumedGrossAmount: number;

  @ApiProperty({ example: 35000 })
  availableGrossAmount: number;

  @ApiProperty({ example: 50000 })
  amount: number;

  @ApiProperty({ example: 15000 })
  consumedAmount: number;

  @ApiProperty({ example: 35000 })
  availableAmount: number;

  @ApiPropertyOptional({ example: 'PRJ-001' })
  projectCode?: string | null;

  @ApiPropertyOptional({ example: 'Branch Renovation' })
  projectName?: string | null;

  @ApiPropertyOptional({ example: 'Supplier advance' })
  remarks?: string | null;

  @ApiProperty({ type: [PurchaseOrderCopyFromCandidateDetailDto] })
  details: PurchaseOrderCopyFromCandidateDetailDto[];
}

export class PurchaseOrderCopyFromCandidatesResponseDto {
  @ApiProperty({ type: [PurchaseOrderCopyFromCandidateDto] })
  records: PurchaseOrderCopyFromCandidateDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
