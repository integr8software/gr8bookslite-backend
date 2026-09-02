import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProvisionalReceiptStatus } from '@prisma/client';

export class ProvisionalReceiptDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lineNumber!: number;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  partyCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  partyName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  particulars!: string | null;

  @ApiPropertyOptional({ nullable: true })
  referenceNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenter!: string | null;

  @ApiPropertyOptional({ nullable: true })
  vatType!: string | null;

  @ApiProperty()
  vatPercent!: number;

  @ApiPropertyOptional({ nullable: true })
  cwtCode!: string | null;

  @ApiProperty()
  cwtPercent!: number;

  @ApiProperty()
  netAmount!: number;

  @ApiProperty()
  vatAmount!: number;

  @ApiProperty()
  ewtAmount!: number;

  @ApiProperty()
  grossAmount!: number;

  @ApiProperty()
  totalReceived!: number;
}

export class ProvisionalReceiptJournalEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  referenceType!: string;

  @ApiProperty()
  referenceId!: string;

  @ApiProperty()
  lineNumber!: number;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  exchangeRate!: number;

  @ApiPropertyOptional({ nullable: true })
  particulars!: string | null;

  @ApiProperty()
  debit!: number;

  @ApiProperty()
  credit!: number;

  @ApiPropertyOptional({ nullable: true })
  vatType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  atcCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  partyCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  partyName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenter!: string | null;

  @ApiPropertyOptional({ nullable: true })
  refNo!: string | null;
}

export class ProvisionalReceiptResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  transactionNo!: string;

  @ApiProperty()
  documentDate!: string;

  @ApiProperty()
  dueDate!: string;

  @ApiPropertyOptional({ nullable: true })
  receiptNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  referenceNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  partyId!: string | null;

  @ApiProperty()
  customerCode!: string;

  @ApiProperty()
  customerName!: string;

  @ApiPropertyOptional({ nullable: true })
  billToName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentType!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  exchangeRate!: number;

  @ApiProperty()
  netAmount!: number;

  @ApiProperty()
  vatAmount!: number;

  @ApiProperty()
  wvatAmount!: number;

  @ApiProperty()
  ewtAmount!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  grossAmount!: number;

  @ApiProperty()
  receivableAccountId!: string;

  @ApiProperty()
  receivableAccountCode!: string;

  @ApiProperty()
  receivableAccountTitle!: string;

  @ApiPropertyOptional({ nullable: true })
  remarks!: string | null;

  @ApiProperty({ enum: ProvisionalReceiptStatus })
  status!: ProvisionalReceiptStatus;

  @ApiProperty({ type: [ProvisionalReceiptDetailResponseDto] })
  details!: ProvisionalReceiptDetailResponseDto[];

  @ApiProperty({ type: [ProvisionalReceiptJournalEntryResponseDto] })
  journalEntries!: ProvisionalReceiptJournalEntryResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class ProvisionalReceiptStatisticsResponseDto {
  @ApiProperty()
  cancelledReceipts!: number;

  @ApiProperty()
  disapprovedReceipts!: number;

  @ApiProperty()
  draftReceipts!: number;

  @ApiProperty()
  forApprovalReceipts!: number;

  @ApiProperty()
  postedReceipts!: number;

  @ApiProperty()
  totalReceipts!: number;
}

export class ProvisionalReceiptPermissionsResponseDto {
  @ApiProperty()
  canApprove!: boolean;

  @ApiProperty()
  canCancel!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canDisapprove!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiProperty()
  canPost!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canView!: boolean;
}

export class ProvisionalReceiptPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ProvisionalReceiptListResponseDto {
  @ApiProperty({ type: [ProvisionalReceiptResponseDto] })
  receipts!: ProvisionalReceiptResponseDto[];

  @ApiProperty({ type: ProvisionalReceiptStatisticsResponseDto })
  statistics!: ProvisionalReceiptStatisticsResponseDto;

  @ApiProperty({ type: ProvisionalReceiptPaginationResponseDto })
  pagination!: ProvisionalReceiptPaginationResponseDto;

  @ApiProperty({ type: ProvisionalReceiptPermissionsResponseDto })
  permissions!: ProvisionalReceiptPermissionsResponseDto;
}

export class ProvisionalReceiptContainerResponseDto {
  @ApiProperty({ type: ProvisionalReceiptResponseDto })
  receipt!: ProvisionalReceiptResponseDto;

  @ApiProperty({ type: ProvisionalReceiptPermissionsResponseDto })
  permissions!: ProvisionalReceiptPermissionsResponseDto;
}

export class SaveProvisionalReceiptResponseDto extends ProvisionalReceiptContainerResponseDto {
  @ApiProperty()
  message!: string;
}

export class ProvisionalReceiptNumberSuggestionResponseDto {
  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty()
  inputMode!: string;

  @ApiProperty()
  transactionNo!: string;
}
