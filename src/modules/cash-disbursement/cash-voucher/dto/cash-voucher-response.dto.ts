import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashVoucherStatus } from '@prisma/client';

export class CashVoucherDetailResponseDto {
  @ApiProperty({ description: 'Detail Primary Key ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Line Number', example: 1 })
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Account ID', example: '1' })
  accountId?: string | null;

  @ApiProperty({ description: 'Account Code', example: '6001010000' })
  accountCode: string;

  @ApiProperty({ description: 'Account Title', example: 'Office Supplies Expense' })
  accountTitle: string;

  @ApiPropertyOptional({ description: 'Particulars', example: 'Office supplies for HQ' })
  particulars?: string | null;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Monthly supplies replenishment' })
  remarks?: string | null;

  @ApiProperty({ description: 'Debit Amount', example: 5000.0 })
  debit: number;

  @ApiProperty({ description: 'Credit Amount', example: 0.0 })
  credit: number;

  @ApiProperty({ description: 'Gross Amount', example: 5000.0 })
  grossAmount: number;

  @ApiProperty({ description: 'Net Amount', example: 4464.29 })
  netAmount: number;

  @ApiPropertyOptional({ description: 'VAT Type / Label', example: 'VAT Inclusive' })
  vatType?: string | null;

  @ApiPropertyOptional({ description: 'VAT Code', example: 'VAT-IN' })
  vatCode?: string | null;

  @ApiProperty({ description: 'VAT Percent', example: 12.0 })
  vatPercent: number;

  @ApiProperty({ description: 'VAT Amount', example: 535.71 })
  vatAmount: number;

  @ApiPropertyOptional({ description: 'EWT Code', example: 'WI158' })
  ewtCode?: string | null;

  @ApiProperty({ description: 'EWT Percent', example: 1.0 })
  ewtPercent: number;

  @ApiProperty({ description: 'EWT Amount', example: 44.64 })
  ewtAmount: number;

  @ApiProperty({ description: 'Disburse Amount', example: 4955.36 })
  disburseAmount: number;

  @ApiPropertyOptional({ description: 'Party ID', example: '1' })
  partyId?: string | null;

  @ApiPropertyOptional({ description: 'Party Code', example: 'SUP-001' })
  partyCode?: string | null;

  @ApiPropertyOptional({ description: 'Party Name', example: 'National Bookstore' })
  partyName?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center Name / Snapshot', example: 'Admin Dept' })
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ description: 'Reference ID / No', example: 'REF-001' })
  refId?: string | null;

  @ApiPropertyOptional({ description: 'Check Date (YYYY-MM-DD)', example: '2026-06-11' })
  checkDate?: string | null;

  @ApiPropertyOptional({ description: 'Check Number', example: 'CHK-123456' })
  checkNo?: string | null;

  @ApiPropertyOptional({ description: 'Check Status', example: 'Cleared' })
  checkStatus?: string | null;
}

export class CashVoucherRecordResponseDto {
  @ApiProperty({ description: 'Cash Voucher ID', example: '1' })
  id: string;

  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  branchUnitId?: number | null;

  @ApiProperty({ description: 'Voucher Sequence Number', example: 'CV-2026-000001' })
  voucherNo: string;

  @ApiProperty({ description: 'Voucher Date (YYYY-MM-DD)', example: '2026-06-11' })
  voucherDate: string;

  @ApiPropertyOptional({ description: 'Payment Due Date (YYYY-MM-DD)', example: '2026-06-11' })
  paymentDueDate?: string | null;

  @ApiPropertyOptional({ description: 'Reference No', example: 'REF-001' })
  referenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Source Reference Module', example: 'Accounts Payable Voucher' })
  referenceModule?: string | null;

  @ApiPropertyOptional({ description: 'Voucher Reference No', example: 'APV-2026-0001' })
  voucherReferenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Invoice Reference No', example: 'INV-2026-0001' })
  invoiceReferenceNo?: string | null;

  @ApiProperty({ description: 'Payment Method', example: 'Cash' })
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Disbursement Type', example: 'Vendor Payment' })
  disbursementType?: string | null;

  @ApiPropertyOptional({ description: 'Party Primary Key ID', example: '1' })
  partyId?: string | null;

  @ApiProperty({ description: 'Party Code', example: 'SUP-001' })
  partyCode: string;

  @ApiProperty({ description: 'Party Name', example: 'National Bookstore' })
  partyName: string;

  @ApiPropertyOptional({ description: 'Credit Chart Account ID', example: '1' })
  creditAccountId?: string | null;

  @ApiPropertyOptional({ description: 'Cost Center / Project Code', example: 'CC-01' })
  costCenter?: string | null;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-01' })
  projectCode?: string | null;

  @ApiPropertyOptional({ description: 'Project Name', example: 'Main Office Expansion' })
  projectName?: string | null;

  @ApiPropertyOptional({ description: 'Prepared By Name', example: 'John Doe' })
  preparedBy?: string | null;

  @ApiProperty({ description: 'Currency Code', example: 'PHP' })
  currency: string;

  @ApiProperty({ description: 'Exchange Rate', example: 1.0 })
  fxRate: number;

  @ApiProperty({ description: 'Total Voucher Amount', example: 5000.0 })
  amount: number;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Disbursement for supplies' })
  remarks?: string | null;

  @ApiProperty({ description: 'Status', enum: CashVoucherStatus, example: CashVoucherStatus.DRAFT })
  status: CashVoucherStatus;

  @ApiProperty({ description: 'Details / Line items', type: [CashVoucherDetailResponseDto] })
  details: CashVoucherDetailResponseDto[];

  @ApiPropertyOptional({ description: 'Created By User Name', example: 'System Administrator' })
  createdBy?: string | null;

  @ApiProperty({ description: 'Created Timestamp', example: '2026-06-11T08:30:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Updated By User Name', example: 'System Administrator' })
  updatedBy?: string | null;

  @ApiPropertyOptional({ description: 'Updated Timestamp', example: '2026-06-11T08:30:00.000Z' })
  updatedAt?: string | null;
}

export class CashVoucherStatisticsDto {
  @ApiProperty({ description: 'Total Vouchers Count', example: 10 })
  totalVouchers: number;

  @ApiProperty({ description: 'Draft Vouchers Count', example: 2 })
  draftVouchers: number;

  @ApiProperty({ description: 'For Approval Vouchers Count', example: 3 })
  forApprovalVouchers: number;

  @ApiProperty({ description: 'Posted Vouchers Count', example: 4 })
  postedVouchers: number;

  @ApiProperty({ description: 'Disapproved Vouchers Count', example: 0 })
  disapprovedVouchers: number;

  @ApiProperty({ description: 'Cancelled Vouchers Count', example: 1 })
  cancelledVouchers: number;
}

export class CashVoucherPaginationMetaDto {
  @ApiProperty({ description: 'Current Page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per Page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total Records Count', example: 50 })
  total: number;

  @ApiProperty({ description: 'Total Pages Count', example: 3 })
  totalPages: number;
}

export class CashVoucherListResponseDto {
  @ApiProperty({ description: 'List of Cash Vouchers', type: [CashVoucherRecordResponseDto] })
  data: CashVoucherRecordResponseDto[];

  @ApiProperty({ description: 'Pagination Metadata', type: CashVoucherPaginationMetaDto })
  meta: CashVoucherPaginationMetaDto;

  @ApiPropertyOptional({ description: 'Voucher Status Statistics', type: CashVoucherStatisticsDto })
  statistics?: CashVoucherStatisticsDto;
}

export class CashVoucherSingleResponseDto {
  @ApiProperty({ description: 'Cash Voucher Record', type: CashVoucherRecordResponseDto })
  data: CashVoucherRecordResponseDto;
}
