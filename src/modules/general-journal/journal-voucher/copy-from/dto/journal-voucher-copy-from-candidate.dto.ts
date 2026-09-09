import { ApiProperty } from '@nestjs/swagger';

export class JournalVoucherCopyFromCandidateDto {
  @ApiProperty({ example: 'JV:JV-000001:L1' })
  id: string;

  @ApiProperty({ example: 'Journal Voucher' })
  source: string;

  @ApiProperty({ example: 'JV-000001' })
  sourceNo: string;

  @ApiProperty({ example: 'JV-000001' })
  transactionNo: string;

  @ApiProperty({ example: 1 })
  lineNumber: number;

  @ApiProperty({ example: '2026-09-09' })
  documentDate: string;

  @ApiProperty({ example: 1 })
  branchUnitId: number;

  @ApiProperty({ example: 'PHP' })
  currency: string;

  @ApiProperty({ example: 1 })
  exchangeRate: number;

  @ApiProperty({ example: 'PTY-0001', nullable: true })
  partyCode: string | null;

  @ApiProperty({ example: 'Juan Dela Cruz', nullable: true })
  partyName: string | null;

  @ApiProperty({ example: '1130-CA' })
  accountCode: string;

  @ApiProperty({ example: 'Employee Advance' })
  accountTitle: string;

  @ApiProperty({ example: 'Liquidation of employee advance', nullable: true })
  particulars: string | null;

  @ApiProperty({ example: 'CA:CA-000001', nullable: true })
  refNo: string | null;

  @ApiProperty({ example: 'Admin', nullable: true })
  responsibilityCenter: string | null;

  @ApiProperty({ example: 1200 })
  amount: number;

  @ApiProperty({ example: 200 })
  consumedAmount: number;

  @ApiProperty({ example: 1000 })
  availableAmount: number;

  @ApiProperty({ enum: ['debit', 'credit'], example: 'debit' })
  side: 'debit' | 'credit';
}

export class JournalVoucherCopyFromCandidatesResponseDto {
  @ApiProperty({ type: () => [JournalVoucherCopyFromCandidateDto] })
  records: JournalVoucherCopyFromCandidateDto[];

  @ApiProperty()
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}
