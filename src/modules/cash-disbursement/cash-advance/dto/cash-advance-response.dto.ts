import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashAdvanceStatus } from '@prisma/client';

export class CashAdvanceDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'CA-2026-00001' })
  transNo: string;

  @ApiProperty({ example: '2026-06-11' })
  documentDate: string;

  @ApiPropertyOptional({ example: '2026-06-11' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 'REF-12345' })
  referenceNo?: string;

  @ApiPropertyOptional({ example: '17' })
  partyId?: string;

  @ApiProperty({ example: 'EMP-0017' })
  partyCode: string;

  @ApiProperty({ example: 'Maria Santos' })
  partyName: string;

  @ApiPropertyOptional({ example: '1130-CA' })
  accountCode?: string;

  @ApiPropertyOptional({ example: 'Cash Advance - Employees' })
  accountTitle?: string;

  @ApiPropertyOptional({ example: 'Operations' })
  costCenter?: string;

  @ApiPropertyOptional({ example: 'OPS-01' })
  costCenterCode?: string;

  @ApiPropertyOptional({ example: 'Site Expansion' })
  projectName?: string;

  @ApiPropertyOptional({ example: 'PRJ-001' })
  projectCode?: string;

  @ApiPropertyOptional({ example: 'Site Expansion', description: 'Legacy alias for projectName' })
  projectRef?: string;

  @ApiProperty({ example: 'PHP' })
  currency: string;

  @ApiProperty({ example: 1.0 })
  fxRate: number;

  @ApiProperty({ example: 12500.0 })
  amount: number;

  @ApiPropertyOptional({ example: 'Optional remarks' })
  remarks?: string;

  @ApiProperty({ enum: CashAdvanceStatus, example: CashAdvanceStatus.DRAFT })
  status: CashAdvanceStatus;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  createdBy?: string;

  @ApiProperty({ example: '2026-06-11T08:15:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({ example: 'Maria Santos' })
  updatedBy?: string;

  @ApiPropertyOptional({ example: '2026-06-11T08:15:00.000Z' })
  updatedAt?: string;
}

export class CashAdvanceListResponseDto {
  @ApiProperty({ type: [CashAdvanceDto] })
  data: CashAdvanceDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CashAdvanceSingleResponseDto {
  @ApiProperty({ example: 'Cash advance operation successfully completed.' })
  message: string;

  @ApiProperty({ type: CashAdvanceDto })
  data: CashAdvanceDto;
}
