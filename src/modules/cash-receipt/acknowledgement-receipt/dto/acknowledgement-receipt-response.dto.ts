import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcknowledgementReceiptStatus } from '@prisma/client';

export class AcknowledgementReceiptDetailResponseDto {
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

export class AcknowledgementReceiptJournalEntryResponseDto {
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

export class AcknowledgementReceiptResponseDto {
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

  @ApiProperty({ enum: AcknowledgementReceiptStatus })
  status!: AcknowledgementReceiptStatus;

  @ApiProperty({ type: [AcknowledgementReceiptDetailResponseDto] })
  details!: AcknowledgementReceiptDetailResponseDto[];

  @ApiProperty({ type: [AcknowledgementReceiptJournalEntryResponseDto] })
  journalEntries!: AcknowledgementReceiptJournalEntryResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class AcknowledgementReceiptStatisticsResponseDto {
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

export class AcknowledgementReceiptPermissionsResponseDto {
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

export class AcknowledgementReceiptPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AcknowledgementReceiptListResponseDto {
  @ApiProperty({ type: [AcknowledgementReceiptResponseDto] })
  receipts!: AcknowledgementReceiptResponseDto[];

  @ApiProperty({ type: AcknowledgementReceiptStatisticsResponseDto })
  statistics!: AcknowledgementReceiptStatisticsResponseDto;

  @ApiProperty({ type: AcknowledgementReceiptPaginationResponseDto })
  pagination!: AcknowledgementReceiptPaginationResponseDto;

  @ApiProperty({ type: AcknowledgementReceiptPermissionsResponseDto })
  permissions!: AcknowledgementReceiptPermissionsResponseDto;
}

export class AcknowledgementReceiptContainerResponseDto {
  @ApiProperty({ type: AcknowledgementReceiptResponseDto })
  receipt!: AcknowledgementReceiptResponseDto;

  @ApiProperty({ type: AcknowledgementReceiptPermissionsResponseDto })
  permissions!: AcknowledgementReceiptPermissionsResponseDto;
}

export class SaveAcknowledgementReceiptResponseDto extends AcknowledgementReceiptContainerResponseDto {
  @ApiProperty()
  message!: string;
}

export class AcknowledgementReceiptNumberSuggestionResponseDto {
  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty()
  inputMode!: string;

  @ApiProperty()
  transactionNo!: string;
}
