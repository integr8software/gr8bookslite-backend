import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountsPayableVoucherCopyFromCandidateDto {
  @ApiProperty({ description: 'Accounts Payable Voucher ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Accounts Payable Voucher transaction number', example: 'APV-2026-000001' })
  transactionNo: string;

  @ApiProperty({ description: 'Document date in YYYY-MM-DD format', example: '2026-09-07' })
  documentDate: string;

  @ApiProperty({ description: 'Party code snapshot', example: 'SUP-001' })
  partyCode: string;

  @ApiPropertyOptional({ description: 'Party primary key ID', example: '1' })
  partyId?: string | null;

  @ApiProperty({ description: 'Party name snapshot', example: 'Anna Supplies' })
  partyName: string;

  @ApiProperty({ description: 'Currency code', example: 'PHP' })
  currency: string;

  @ApiProperty({ description: 'Exchange rate', example: 1 })
  exchangeRate: number;

  @ApiProperty({ description: 'Original APV amount', example: 5000 })
  amount: number;

  @ApiProperty({ description: 'Amount already copied to active Cash/Disbursement Vouchers', example: 3000 })
  consumedAmount: number;

  @ApiProperty({ description: 'Remaining amount available to copy', example: 2000 })
  availableAmount: number;

  @ApiPropertyOptional({ description: 'Reference number', example: 'INV-001' })
  referenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Payable account ID', example: '1' })
  creditAccountId?: string | null;

  @ApiProperty({ description: 'Payable account code', example: '20101010' })
  creditAccountCode: string;

  @ApiProperty({ description: 'Payable account title', example: 'Accounts Payable' })
  creditAccountTitle: string;

  @ApiPropertyOptional({ description: 'Project code', example: 'PRJ-01' })
  projectCode?: string | null;

  @ApiPropertyOptional({ description: 'Project name', example: 'Main Office Expansion' })
  projectName?: string | null;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Partial payment' })
  remarks?: string | null;

  @ApiProperty({ description: 'Source module display name', example: 'Accounts Payable Voucher' })
  source: string;

  @ApiProperty({ description: 'Source transaction number', example: 'APV-2026-000001' })
  sourceNo: string;
}

export class AccountsPayableVoucherCopyFromCandidatesResponseDto {
  @ApiProperty({ description: 'Available APV records', type: [AccountsPayableVoucherCopyFromCandidateDto] })
  records: AccountsPayableVoucherCopyFromCandidateDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
