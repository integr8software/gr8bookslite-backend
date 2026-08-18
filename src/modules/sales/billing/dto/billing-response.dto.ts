import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingStatus } from '@prisma/client';

export class BillingDetailResponseDto {
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

export class BillingJournalEntryResponseDto {
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

export class BillingResponseDto {
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

  @ApiProperty({ enum: BillingStatus })
  status!: BillingStatus;

  @ApiProperty({ type: [BillingDetailResponseDto] })
  details!: BillingDetailResponseDto[];

  @ApiProperty({ type: [BillingJournalEntryResponseDto] })
  journalEntries!: BillingJournalEntryResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class BillingStatisticsResponseDto {
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

export class BillingPermissionsResponseDto {
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

export class BillingPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BillingListResponseDto {
  @ApiProperty({ type: [BillingResponseDto] })
  invoices!: BillingResponseDto[];

  @ApiProperty({ type: BillingStatisticsResponseDto })
  statistics!: BillingStatisticsResponseDto;

  @ApiProperty({ type: BillingPaginationResponseDto })
  pagination!: BillingPaginationResponseDto;

  @ApiProperty({ type: BillingPermissionsResponseDto })
  permissions!: BillingPermissionsResponseDto;
}

export class BillingContainerResponseDto {
  @ApiProperty({ type: BillingResponseDto })
  invoice!: BillingResponseDto;

  @ApiProperty({ type: BillingPermissionsResponseDto })
  permissions!: BillingPermissionsResponseDto;
}

export class SaveBillingResponseDto extends BillingContainerResponseDto {
  @ApiProperty()
  message!: string;
}

export class BillingNumberSuggestionResponseDto {
  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty()
  inputMode!: string;

  @ApiProperty()
  transactionNo!: string;
}
