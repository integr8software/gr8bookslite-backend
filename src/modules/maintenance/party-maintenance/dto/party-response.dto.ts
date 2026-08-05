import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyClassification, PartyStatus, PartyType } from '@prisma/client';

export class PartyAddressResponseDto {
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
  province!: string;

  @ApiProperty()
  provinceCode!: string;

  @ApiProperty()
  region!: string;

  @ApiProperty()
  regionCode!: string;

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
}

export class PartyAccountingAccountSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;
}

export class PartyAccountingAccountsResponseDto {
  @ApiProperty({ type: PartyAccountingAccountSummaryResponseDto, nullable: true })
  defaultReceivableAccount!: PartyAccountingAccountSummaryResponseDto | null;

  @ApiProperty({ type: PartyAccountingAccountSummaryResponseDto, nullable: true })
  customerAdvanceAccount!: PartyAccountingAccountSummaryResponseDto | null;

  @ApiProperty({ type: PartyAccountingAccountSummaryResponseDto, nullable: true })
  defaultPayableAccount!: PartyAccountingAccountSummaryResponseDto | null;

  @ApiProperty({ type: PartyAccountingAccountSummaryResponseDto, nullable: true })
  vendorAdvanceAccount!: PartyAccountingAccountSummaryResponseDto | null;

  @ApiProperty({ type: PartyAccountingAccountSummaryResponseDto, nullable: true })
  employeeAdvanceAccount!: PartyAccountingAccountSummaryResponseDto | null;

  @ApiProperty({ type: PartyAccountingAccountSummaryResponseDto, nullable: true })
  employeePayableAccount!: PartyAccountingAccountSummaryResponseDto | null;
}

export class PartyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  partyCodeNo!: string;

  @ApiProperty({ enum: PartyClassification })
  classification!: PartyClassification;

  @ApiProperty({ nullable: true })
  partyEntityType!: string | null;

  @ApiProperty({ enum: PartyType, isArray: true })
  partyTypes!: PartyType[];

  @ApiProperty({ enum: PartyStatus })
  status!: PartyStatus;

  @ApiProperty()
  partyName!: string;

  @ApiProperty()
  tradeName!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  middleName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  suffixName!: string;

  @ApiProperty()
  honorific!: string;

  @ApiProperty()
  gender!: string;

  @ApiProperty()
  civilStatus!: string;

  @ApiProperty()
  nationality!: string;

  @ApiProperty()
  memberRegistrationDate!: string;

  @ApiProperty({ type: PartyAddressResponseDto })
  address!: PartyAddressResponseDto;

  @ApiProperty({ type: [PartyAddressResponseDto] })
  addresses!: PartyAddressResponseDto[];

  @ApiProperty()
  defaultReceivableAccount!: string;

  @ApiProperty()
  customerAdvanceAccount!: string;

  @ApiProperty()
  defaultPayableAccount!: string;

  @ApiProperty()
  vendorAdvanceAccount!: string;

  @ApiProperty()
  employeeAdvanceAccount!: string;

  @ApiProperty()
  employeePayableAccount!: string;

  @ApiProperty({ type: PartyAccountingAccountsResponseDto })
  accountingAccounts!: PartyAccountingAccountsResponseDto;

  @ApiProperty()
  termId!: string;

  @ApiProperty()
  termName!: string;

  @ApiProperty()
  tin!: string;

  @ApiProperty()
  atcCode!: string;

  @ApiProperty()
  defaultPurchaseInputVatTaxSourceKey!: string;

  @ApiProperty()
  defaultPurchaseEwtTaxSourceKey!: string;

  @ApiProperty()
  defaultPurchaseFwtTaxSourceKey!: string;

  @ApiProperty()
  defaultPurchaseWvatTaxSourceKey!: string;

  @ApiProperty()
  defaultSalesOutputVatTaxSourceKey!: string;

  @ApiProperty()
  defaultSalesCwtTaxSourceKey!: string;

  @ApiProperty()
  defaultSalesWvatTaxSourceKey!: string;

  @ApiProperty()
  contactPerson!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  contactNo!: string;

  @ApiProperty()
  landline!: string;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class PartyStatisticsResponseDto {
  @ApiProperty()
  activeParties!: number;

  @ApiProperty()
  inactiveParties!: number;

  @ApiProperty()
  individualParties!: number;

  @ApiProperty()
  multiTypeParties!: number;

  @ApiProperty()
  nonIndividualParties!: number;

  @ApiProperty()
  totalParties!: number;
}

export class PartyPermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canCancel!: boolean;

  @ApiProperty()
  canUncancel!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiPropertyOptional()
  canImport?: boolean;
}

export class PartyPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PartyListResponseDto {
  @ApiProperty({ type: [PartyResponseDto] })
  parties!: PartyResponseDto[];

  @ApiProperty()
  totalRows!: number;

  @ApiProperty({ type: PartyStatisticsResponseDto })
  statistics!: PartyStatisticsResponseDto;

  @ApiProperty({ type: PartyPaginationResponseDto })
  pagination!: PartyPaginationResponseDto;

  @ApiProperty({ type: PartyPermissionsResponseDto })
  permissions!: PartyPermissionsResponseDto;
}

export class PartyContainerResponseDto {
  @ApiProperty({ type: PartyResponseDto })
  party!: PartyResponseDto;

  @ApiProperty({ type: PartyPermissionsResponseDto })
  permissions!: PartyPermissionsResponseDto;
}

export class SavePartyResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PartyResponseDto })
  party!: PartyResponseDto;
}

export class ImportPartiesResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [PartyResponseDto] })
  parties!: PartyResponseDto[];
}

export class PartyOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  partyCodeNo!: string;

  @ApiProperty({ enum: PartyClassification })
  classification!: PartyClassification;

  @ApiProperty({ enum: PartyType, isArray: true })
  partyTypes!: PartyType[];

  @ApiProperty()
  name!: string;

  @ApiProperty()
  contactPerson!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  contactNo!: string;

  @ApiProperty({ enum: PartyStatus })
  status!: PartyStatus;
}

export class PartyOptionsResponseDto {
  @ApiProperty({ type: [PartyOptionResponseDto] })
  parties!: PartyOptionResponseDto[];
}

export class PartyAccountingAccountOptionResponseDto {
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

export class PartyAccountingAccountIdsResponseDto {
  @ApiProperty()
  defaultReceivableAccount!: string;

  @ApiProperty()
  customerAdvanceAccount!: string;

  @ApiProperty()
  defaultPayableAccount!: string;

  @ApiProperty()
  vendorAdvanceAccount!: string;

  @ApiProperty()
  employeeAdvanceAccount!: string;

  @ApiProperty()
  employeePayableAccount!: string;
}

export class PartyAccountingAccountOptionsResponseDto {
  @ApiProperty({ type: [PartyAccountingAccountOptionResponseDto] })
  defaultReceivableAccount!: PartyAccountingAccountOptionResponseDto[];

  @ApiProperty({ type: [PartyAccountingAccountOptionResponseDto] })
  customerAdvanceAccount!: PartyAccountingAccountOptionResponseDto[];

  @ApiProperty({ type: [PartyAccountingAccountOptionResponseDto] })
  defaultPayableAccount!: PartyAccountingAccountOptionResponseDto[];

  @ApiProperty({ type: [PartyAccountingAccountOptionResponseDto] })
  vendorAdvanceAccount!: PartyAccountingAccountOptionResponseDto[];

  @ApiProperty({ type: [PartyAccountingAccountOptionResponseDto] })
  employeeAdvanceAccount!: PartyAccountingAccountOptionResponseDto[];

  @ApiProperty({ type: [PartyAccountingAccountOptionResponseDto] })
  employeePayableAccount!: PartyAccountingAccountOptionResponseDto[];
}

export class PartyAccountingOptionsResponseDto {
  @ApiProperty({ type: PartyAccountingAccountIdsResponseDto })
  defaultAccounts!: PartyAccountingAccountIdsResponseDto;

  @ApiProperty({ type: PartyAccountingAccountOptionsResponseDto })
  accountOptions!: PartyAccountingAccountOptionsResponseDto;
}
