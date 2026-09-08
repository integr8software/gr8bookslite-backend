import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountsPayableVoucherCopyFromCandidateDetailDto {
  @ApiProperty({ description: 'Accounts Payable Voucher detail line ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Source line number', example: 1 })
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Expense account ID', example: '1' })
  expenseAccountId?: string | null;

  @ApiProperty({ description: 'Expense account code', example: '6001010000' })
  expenseAccountCode: string;

  @ApiProperty({ description: 'Expense account title / expense type', example: '13th Month Pay' })
  expenseType: string;

  @ApiProperty({ description: 'Original APV detail amount', example: 50000 })
  amount: number;

  @ApiProperty({ description: 'Net expense amount', example: 44000 })
  netAmount: number;

  @ApiPropertyOptional({ description: 'VAT type/code copied from APV detail', example: 'Input VAT' })
  vat?: string | null;

  @ApiProperty({ description: 'VAT percent', example: 12 })
  vatPercent: number;

  @ApiProperty({ description: 'VAT amount', example: 6000 })
  vatAmount: number;

  @ApiPropertyOptional({ description: 'EWT code copied from APV detail', example: 'WI158' })
  ewt?: string | null;

  @ApiProperty({ description: 'EWT percent', example: 3 })
  ewtPercent: number;

  @ApiProperty({ description: 'EWT amount', example: 1500 })
  ewtAmount: number;

  @ApiProperty({ description: 'Payable/disburse amount for this APV detail line', example: 48500 })
  totalAmountDue: number;

  @ApiPropertyOptional({ description: 'Detail party code snapshot', example: 'SUP-001' })
  partyCode?: string | null;

  @ApiPropertyOptional({ description: 'Detail party name snapshot', example: 'Anna Supplies' })
  partyName?: string | null;

  @ApiPropertyOptional({ description: 'Detail particulars', example: '13th Month Pay' })
  particulars?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center ID', example: '1' })
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility center snapshot', example: 'Admin Dept' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ description: 'Detail reference number', example: 'INV-001' })
  referenceNo?: string | null;
}

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

  @ApiProperty({ description: 'Original APV gross amount before VAT/EWT deductions', example: 5000 })
  amount: number;

  @ApiProperty({ description: 'Payable amount already copied to active Cash/Disbursement Vouchers', example: 2910 })
  consumedAmount: number;

  @ApiProperty({ description: 'Remaining payable/disburse amount available to copy', example: 1940 })
  availableAmount: number;

  @ApiProperty({ description: 'Gross amount already copied to active Cash/Disbursement Vouchers', example: 3000 })
  consumedGrossAmount: number;

  @ApiProperty({ description: 'Remaining gross amount available to copy', example: 2000 })
  availableGrossAmount: number;

  @ApiProperty({ description: 'Original APV total payable after VAT/EWT deductions', example: 4850 })
  totalPayable: number;

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

  @ApiProperty({ description: 'APV detail lines to copy into the target voucher', type: [AccountsPayableVoucherCopyFromCandidateDetailDto] })
  details: AccountsPayableVoucherCopyFromCandidateDetailDto[];

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
