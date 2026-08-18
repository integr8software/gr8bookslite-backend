import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingInvoiceStatus } from '@prisma/client';

export class BillingInvoiceDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lineNumber!: number;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  particulars!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  netAmount!: number;

  @ApiProperty()
  vatAmount!: number;

  @ApiProperty()
  wvatAmount!: number;

  @ApiProperty()
  ewtAmount!: number;

  @ApiProperty()
  discountPercent!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  grossAmount!: number;

  @ApiPropertyOptional({ nullable: true })
  vatType!: string | null;

  @ApiProperty()
  vatable!: boolean;

  @ApiProperty()
  vatInclusive!: boolean;

  @ApiProperty()
  withWvat!: boolean;

  @ApiPropertyOptional({ nullable: true })
  wvatType!: string | null;

  @ApiProperty()
  withEwt!: boolean;

  @ApiPropertyOptional({ nullable: true })
  ewtType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  responsibilityCenter!: string | null;
}

export class BillingInvoiceJournalEntryResponseDto {
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

export class SalesBillingInvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  transactionNo!: string;

  @ApiProperty()
  documentDate!: string;

  @ApiProperty()
  dueDate!: string;

  @ApiPropertyOptional({ nullable: true })
  invoiceNo!: string | null;

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
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  contactPerson!: string | null;

  @ApiPropertyOptional({ nullable: true })
  contactNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  businessStyle!: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  projectRef!: string | null;

  @ApiPropertyOptional({ nullable: true })
  salesAssociate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  teamAssigned!: string | null;

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

  @ApiPropertyOptional({ nullable: true })
  termId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  terms!: string | null;

  @ApiProperty()
  receivableAccountId!: string;

  @ApiProperty()
  receivableAccountCode!: string;

  @ApiProperty()
  receivableAccountTitle!: string;

  @ApiPropertyOptional({ nullable: true })
  remarks!: string | null;

  @ApiProperty({ enum: BillingInvoiceStatus })
  status!: BillingInvoiceStatus;

  @ApiProperty({ type: [BillingInvoiceDetailResponseDto] })
  details!: BillingInvoiceDetailResponseDto[];

  @ApiProperty({ type: [BillingInvoiceJournalEntryResponseDto] })
  journalEntries!: BillingInvoiceJournalEntryResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class BillingInvoiceStatisticsResponseDto {
  @ApiProperty()
  cancelledInvoices!: number;

  @ApiProperty()
  disapprovedInvoices!: number;

  @ApiProperty()
  draftInvoices!: number;

  @ApiProperty()
  forApprovalInvoices!: number;

  @ApiProperty()
  postedInvoices!: number;

  @ApiProperty()
  totalInvoices!: number;
}

export class BillingInvoicePermissionsResponseDto {
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

export class BillingInvoicePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BillingInvoiceListResponseDto {
  @ApiProperty({ type: [SalesBillingInvoiceResponseDto] })
  invoices!: SalesBillingInvoiceResponseDto[];

  @ApiProperty({ type: BillingInvoiceStatisticsResponseDto })
  statistics!: BillingInvoiceStatisticsResponseDto;

  @ApiProperty({ type: BillingInvoicePaginationResponseDto })
  pagination!: BillingInvoicePaginationResponseDto;

  @ApiProperty({ type: BillingInvoicePermissionsResponseDto })
  permissions!: BillingInvoicePermissionsResponseDto;
}

export class BillingInvoiceContainerResponseDto {
  @ApiProperty({ type: SalesBillingInvoiceResponseDto })
  invoice!: SalesBillingInvoiceResponseDto;

  @ApiProperty({ type: BillingInvoicePermissionsResponseDto })
  permissions!: BillingInvoicePermissionsResponseDto;
}

export class SaveSalesBillingInvoiceResponseDto extends BillingInvoiceContainerResponseDto {
  @ApiProperty()
  message!: string;
}

export class BillingInvoiceNumberSuggestionResponseDto {
  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty()
  inputMode!: string;

  @ApiProperty()
  transactionNo!: string;
}
