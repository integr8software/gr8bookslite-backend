import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AccountsPayableVoucherPayableType,
  AccountsPayableVoucherStatus,
  PartyClassification,
  PartyStatus,
  PartyType,
  TermDateMode,
  TermStatus,
  TransactionNumberInputMode,
} from '@prisma/client';

export class AccountsPayableVoucherDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: number;

  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty({ nullable: true })
  partyId!: string | null;

  @ApiProperty()
  lineNumber!: number;

  @ApiProperty()
  expenseAccountId!: string;

  @ApiProperty()
  expenseAccountCode!: string;

  @ApiProperty()
  expenseType!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  exchangeRate!: number;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  netAmount!: number;

  @ApiProperty({ nullable: true })
  vat!: string | null;

  @ApiProperty()
  vatPercent!: number;

  @ApiProperty()
  vatAmount!: number;

  @ApiProperty({ nullable: true })
  ewt!: string | null;

  @ApiProperty()
  ewtPercent!: number;

  @ApiProperty()
  ewtAmount!: number;

  @ApiProperty()
  totalAmountDue!: number;

  @ApiProperty({ nullable: true })
  partyCode!: string | null;

  @ApiProperty({ nullable: true })
  partyName!: string | null;

  @ApiProperty({ nullable: true })
  particulars!: string | null;

  @ApiProperty({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiProperty({ nullable: true })
  responsibilityCenter!: string | null;

  @ApiProperty({ nullable: true })
  referenceNo!: string | null;
}

export class AccountsPayableVoucherJournalEntryResponseDto {
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

  @ApiProperty({ nullable: true })
  particulars!: string | null;

  @ApiProperty()
  debit!: number;

  @ApiProperty()
  credit!: number;

  @ApiProperty({ nullable: true })
  vatType!: string | null;

  @ApiProperty({ nullable: true })
  atcCode!: string | null;

  @ApiProperty({ nullable: true })
  partyCode!: string | null;

  @ApiProperty({ nullable: true })
  partyName!: string | null;

  @ApiProperty({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiProperty({ nullable: true })
  responsibilityCenter!: string | null;

  @ApiProperty({ nullable: true })
  refNo!: string | null;
}

export class AccountsPayableVoucherJournalEntryHeaderResponseDto {
  @ApiProperty({ nullable: true })
  id!: string | null;

  @ApiProperty()
  referenceType!: string;

  @ApiProperty()
  referenceId!: string;

  @ApiProperty({ nullable: true })
  referenceNo!: string | null;

  @ApiProperty()
  transactionDate!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  exchangeRate!: number;

  @ApiProperty({ nullable: true })
  particulars!: string | null;

  @ApiProperty()
  totalDebit!: number;

  @ApiProperty()
  totalCredit!: number;

  @ApiProperty({ nullable: true })
  status!: string | null;
}

export class AccountsPayableVoucherJournalEntryDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lineNumber!: number;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty()
  debit!: number;

  @ApiProperty()
  credit!: number;

  @ApiProperty({ nullable: true })
  vatType!: string | null;

  @ApiProperty({ nullable: true })
  atcCode!: string | null;

  @ApiProperty({ nullable: true })
  partyCode!: string | null;

  @ApiProperty({ nullable: true })
  partyName!: string | null;

  @ApiProperty({ nullable: true })
  responsibilityCenterId!: string | null;

  @ApiProperty({ nullable: true })
  responsibilityCenter!: string | null;

  @ApiProperty({ nullable: true })
  refNo!: string | null;
}

export class AccountsPayableVoucherJournalEntrySeparatedResponseDto {
  @ApiProperty({ type: AccountsPayableVoucherJournalEntryHeaderResponseDto })
  header!: AccountsPayableVoucherJournalEntryHeaderResponseDto;

  @ApiProperty({ type: [AccountsPayableVoucherJournalEntryDetailResponseDto] })
  details!: AccountsPayableVoucherJournalEntryDetailResponseDto[];
}

export class AccountsPayableVoucherResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  branchUnitId?: number;

  @ApiProperty()
  transactionNo!: string;

  @ApiProperty()
  documentDate!: string;

  @ApiProperty({ nullable: true })
  partyId!: string | null;

  @ApiProperty()
  partyCode!: string;

  @ApiProperty()
  partyName!: string;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  contactPerson!: string | null;

  @ApiProperty({ nullable: true })
  contactNo!: string | null;

  @ApiProperty({ nullable: true })
  projectCode!: string | null;

  @ApiProperty({ nullable: true })
  projectName!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  exchangeRate!: number;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ nullable: true })
  termId!: string | null;

  @ApiProperty({ nullable: true })
  terms!: string | null;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty({ nullable: true })
  referenceNo!: string | null;

  @ApiProperty()
  creditAccountId!: string;

  @ApiProperty()
  creditAccountCode!: string;

  @ApiProperty()
  creditAccountTitle!: string;

  @ApiProperty({ enum: AccountsPayableVoucherPayableType })
  payableType!: AccountsPayableVoucherPayableType;

  @ApiProperty({ nullable: true })
  remarks!: string | null;

  @ApiProperty({ enum: AccountsPayableVoucherStatus })
  status!: AccountsPayableVoucherStatus;

  @ApiProperty({ type: [AccountsPayableVoucherDetailResponseDto] })
  details!: AccountsPayableVoucherDetailResponseDto[];

  @ApiProperty({ type: AccountsPayableVoucherJournalEntrySeparatedResponseDto })
  journalEntry!: AccountsPayableVoucherJournalEntrySeparatedResponseDto;

  @ApiProperty({ type: [AccountsPayableVoucherJournalEntryResponseDto] })
  journalEntries!: AccountsPayableVoucherJournalEntryResponseDto[];

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class AccountsPayableVoucherStatisticsResponseDto {
  @ApiProperty()
  cancelledVouchers!: number;

  @ApiProperty()
  disapprovedVouchers!: number;

  @ApiProperty()
  draftVouchers!: number;

  @ApiProperty()
  forApprovalVouchers!: number;

  @ApiProperty()
  postedVouchers!: number;

  @ApiProperty()
  totalVouchers!: number;
}

export class AccountsPayableVoucherPermissionsResponseDto {
  @ApiProperty()
  canApprove!: boolean;

  @ApiProperty()
  canCancel!: boolean;

  @ApiProperty()
  canClose!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canDisapprove!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canView!: boolean;
}

export class AccountsPayableVoucherPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AccountsPayableVoucherListResponseDto {
  @ApiProperty({ type: [AccountsPayableVoucherResponseDto] })
  vouchers!: AccountsPayableVoucherResponseDto[];

  @ApiProperty({ type: AccountsPayableVoucherStatisticsResponseDto })
  statistics!: AccountsPayableVoucherStatisticsResponseDto;

  @ApiProperty({ type: AccountsPayableVoucherPaginationResponseDto })
  pagination!: AccountsPayableVoucherPaginationResponseDto;

  @ApiProperty({ type: AccountsPayableVoucherPermissionsResponseDto })
  permissions!: AccountsPayableVoucherPermissionsResponseDto;
}

export class AccountsPayableVoucherContainerResponseDto {
  @ApiProperty({ type: AccountsPayableVoucherResponseDto })
  voucher!: AccountsPayableVoucherResponseDto;

  @ApiProperty({ type: AccountsPayableVoucherPermissionsResponseDto })
  permissions!: AccountsPayableVoucherPermissionsResponseDto;
}

export class SaveAccountsPayableVoucherResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AccountsPayableVoucherResponseDto })
  voucher!: AccountsPayableVoucherResponseDto;

  @ApiProperty({ type: AccountsPayableVoucherPermissionsResponseDto })
  permissions!: AccountsPayableVoucherPermissionsResponseDto;
}

export class AccountsPayableVoucherNumberSuggestionResponseDto {
  @ApiProperty()
  branchUnitId!: number;

  @ApiProperty({ enum: TransactionNumberInputMode })
  inputMode!: TransactionNumberInputMode;

  @ApiProperty()
  transactionNo!: string;
}

export class AccountsPayableVoucherLookupAddressResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  addressName!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiProperty()
  addressLine2!: string;

  @ApiProperty()
  barangay!: string;

  @ApiProperty()
  barangayCode!: string;

  @ApiProperty()
  cityMunicipality!: string;

  @ApiProperty()
  cityMunicipalityCode!: string;

  @ApiProperty()
  isBilling!: boolean;

  @ApiProperty()
  isBuilding!: boolean;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isDelivery!: boolean;

  @ApiProperty()
  isForeign!: boolean;

  @ApiProperty()
  isHome!: boolean;

  @ApiProperty()
  province!: string;

  @ApiProperty()
  provinceCode!: string;

  @ApiProperty()
  region!: string;

  @ApiProperty()
  regionCode!: string;
}

export class AccountsPayableVoucherPartyLookupOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  partyCodeNo!: string;

  @ApiProperty({ enum: PartyClassification })
  classification!: PartyClassification;

  @ApiProperty({ enum: PartyType, isArray: true })
  partyTypes!: PartyType[];

  @ApiProperty({ enum: PartyStatus })
  status!: PartyStatus;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: AccountsPayableVoucherLookupAddressResponseDto })
  address!: AccountsPayableVoucherLookupAddressResponseDto;

  @ApiProperty({ type: [AccountsPayableVoucherLookupAddressResponseDto] })
  addresses!: AccountsPayableVoucherLookupAddressResponseDto[];

  @ApiProperty()
  defaultPayableAccount!: string;

  @ApiProperty()
  termId!: string;

  @ApiProperty()
  termName!: string;

  @ApiProperty()
  defaultPurchaseInputVatTaxSourceKey!: string;

  @ApiProperty()
  defaultPurchaseEwtTaxSourceKey!: string;

  @ApiProperty()
  defaultPurchaseFwtTaxSourceKey!: string;

  @ApiProperty()
  defaultPurchaseWvatTaxSourceKey!: string;

  @ApiProperty()
  contactPerson!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  contactNo!: string;
}

export class AccountsPayableVoucherPartyLookupResponseDto {
  @ApiProperty({ type: [AccountsPayableVoucherPartyLookupOptionResponseDto] })
  parties!: AccountsPayableVoucherPartyLookupOptionResponseDto[];
}

export class AccountsPayableVoucherTermLookupOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: TermDateMode })
  dateMode!: TermDateMode;

  @ApiProperty()
  period!: number;

  @ApiProperty({ enum: TermStatus })
  status!: TermStatus;
}

export class AccountsPayableVoucherTermLookupResponseDto {
  @ApiProperty({ type: [AccountsPayableVoucherTermLookupOptionResponseDto] })
  terms!: AccountsPayableVoucherTermLookupOptionResponseDto[];
}

export class AccountsPayableVoucherResponsibilityCenterLookupOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  typeName!: string;

  @ApiProperty()
  status!: string;
}

export class AccountsPayableVoucherResponsibilityCenterLookupResponseDto {
  @ApiProperty({ type: [AccountsPayableVoucherResponsibilityCenterLookupOptionResponseDto] })
  responsibilityCenters!: AccountsPayableVoucherResponsibilityCenterLookupOptionResponseDto[];
}

export class AccountsPayableVoucherPayableAccountLookupOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty()
  accountType!: string;

  @ApiProperty()
  statementGroup!: string;

  @ApiProperty()
  statementSection!: string;

  @ApiProperty({ enum: ['Debit', 'Credit'] })
  normalBalance!: 'Debit' | 'Credit';

  @ApiProperty()
  accountCategory!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ['Active', 'Inactive'] })
  status!: 'Active' | 'Inactive';
}

export class AccountsPayableVoucherLookupDefaultAccountsResponseDto {
  @ApiProperty()
  defaultPayableAccount!: string;

  @ApiProperty()
  employeePayableAccount!: string;
}

export class AccountsPayableVoucherLookupAccountOptionsResponseDto {
  @ApiProperty({ type: [AccountsPayableVoucherPayableAccountLookupOptionResponseDto] })
  defaultPayableAccount!: AccountsPayableVoucherPayableAccountLookupOptionResponseDto[];

  @ApiProperty({ type: [AccountsPayableVoucherPayableAccountLookupOptionResponseDto] })
  employeePayableAccount!: AccountsPayableVoucherPayableAccountLookupOptionResponseDto[];
}

export class AccountsPayableVoucherPayableAccountLookupResponseDto {
  @ApiProperty({ type: AccountsPayableVoucherLookupDefaultAccountsResponseDto })
  defaultAccounts!: AccountsPayableVoucherLookupDefaultAccountsResponseDto;

  @ApiProperty({ type: AccountsPayableVoucherLookupAccountOptionsResponseDto })
  accountOptions!: AccountsPayableVoucherLookupAccountOptionsResponseDto;
}
