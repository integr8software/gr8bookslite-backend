import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxAmountSource, TaxEntrySide, TaxPostingEvent, TaxStatus, TaxTransactionScope } from '@prisma/client';
import { TaxDefaultAccountOptionClassifications } from './tax-default-account-options-query.dto';

export class TaxResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  sourceKey!: string;

  @ApiProperty()
  transactionType!: string;

  @ApiProperty()
  taxType!: string;

  @ApiProperty()
  taxCode!: string;

  @ApiProperty()
  taxDescription!: string;

  @ApiProperty()
  taxRate!: string;

  @ApiProperty()
  taxExempt!: boolean;

  @ApiProperty({ nullable: true })
  taxAlias!: string | null;

  @ApiProperty({ nullable: true })
  atc!: string | null;

  @ApiProperty({ nullable: true })
  officialAtcCode!: string | null;

  @ApiProperty({ nullable: true })
  natureOfIncome!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: TaxStatus })
  status!: TaxStatus;
}

export class TaxListResponseDto {
  @ApiProperty({ type: [TaxResponseDto] })
  taxCodes!: TaxResponseDto[];

  @ApiProperty({ type: [TaxResponseDto] })
  taxes!: TaxResponseDto[];
}

export class TaxContainerResponseDto {
  @ApiProperty({ type: TaxResponseDto })
  tax!: TaxResponseDto;

  @ApiProperty({ type: TaxResponseDto })
  taxCode!: TaxResponseDto;
}

export class TaxAutocompleteOptionResponseDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: TaxResponseDto })
  tax!: TaxResponseDto;

  @ApiProperty({ type: TaxResponseDto })
  taxCode!: TaxResponseDto;
}

export class TaxAutocompleteResponseDto {
  @ApiProperty({ type: [TaxAutocompleteOptionResponseDto] })
  taxCodes!: TaxAutocompleteOptionResponseDto[];

  @ApiProperty({ type: [TaxAutocompleteOptionResponseDto] })
  taxes!: TaxAutocompleteOptionResponseDto[];
}

export class TaxTransactionTypesResponseDto {
  @ApiProperty({ type: [String] })
  transactionTypes!: string[];
}

export class TaxTypesResponseDto {
  @ApiProperty({ type: [String] })
  taxTypes!: string[];
}

export class PartyDefaultClassificationResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  transactionType!: string;

  @ApiProperty({ type: [String] })
  taxTypes!: string[];

  @ApiPropertyOptional()
  officialAtcCodePrefix?: string;
}

export class PartyDefaultClassificationsResponseDto {
  @ApiProperty({ type: [PartyDefaultClassificationResponseDto] })
  classifications!: PartyDefaultClassificationResponseDto[];
}

export class TaxDefaultChartAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty()
  accountType!: string;

  @ApiProperty()
  accountNature!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isPostingAccount!: boolean;
}

export class TaxPostingAccountResponseDto {
  @ApiProperty({ enum: TaxTransactionScope })
  transactionScope!: TaxTransactionScope;

  @ApiProperty({ enum: TaxPostingEvent })
  postingEvent!: TaxPostingEvent;

  @ApiProperty()
  accountRole!: string;

  @ApiProperty({ enum: TaxEntrySide })
  entrySide!: TaxEntrySide;

  @ApiProperty({ enum: TaxAmountSource })
  amountSource!: TaxAmountSource;

  @ApiProperty()
  priority!: number;

  @ApiProperty({ nullable: true })
  companyAccountMappingId!: string | null;

  @ApiProperty({ type: TaxDefaultChartAccountResponseDto, nullable: true })
  chartAccount!: TaxDefaultChartAccountResponseDto | null;
}

export class TaxWithDefaultAccountsResponseDto extends TaxResponseDto {
  @ApiProperty({ type: [TaxPostingAccountResponseDto] })
  postingAccounts!: TaxPostingAccountResponseDto[];

  @ApiProperty({ type: [TaxPostingAccountResponseDto] })
  defaultTaxAccounts!: TaxPostingAccountResponseDto[];
}

export class TaxDefaultAccountsListResponseDto {
  @ApiProperty()
  companyId!: number;

  @ApiProperty({ type: [TaxWithDefaultAccountsResponseDto] })
  taxCodes!: TaxWithDefaultAccountsResponseDto[];

  @ApiProperty({ type: [TaxWithDefaultAccountsResponseDto] })
  taxes!: TaxWithDefaultAccountsResponseDto[];
}

export class TaxDefaultAccountsContainerResponseDto {
  @ApiProperty()
  companyId!: number;

  @ApiProperty({ type: TaxWithDefaultAccountsResponseDto })
  tax!: TaxWithDefaultAccountsResponseDto;

  @ApiProperty({ type: TaxWithDefaultAccountsResponseDto })
  taxCode!: TaxWithDefaultAccountsResponseDto;
}

export class TaxDefaultAccountOptionResponseDto {
  @ApiProperty()
  sourceKey!: string;

  @ApiProperty()
  transactionType!: string;

  @ApiProperty()
  taxType!: string;

  @ApiProperty()
  taxCode!: string;

  @ApiProperty()
  displayCode!: string;

  @ApiProperty()
  taxDescription!: string;

  @ApiProperty({ nullable: true })
  natureOfIncome!: string | null;

  @ApiProperty()
  taxRate!: string;

  @ApiProperty()
  taxExempt!: boolean;

  @ApiProperty({ nullable: true })
  defaultAccountRole!: string | null;

  @ApiProperty({ nullable: true })
  defaultAccountCode!: string | null;

  @ApiProperty({ nullable: true })
  defaultAccountTitle!: string | null;

  @ApiProperty()
  status!: string;
}

export class TaxDefaultAccountOptionGroupResponseDto {
  @ApiProperty({ enum: TaxDefaultAccountOptionClassifications })
  classification!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: [TaxDefaultAccountOptionResponseDto] })
  options!: TaxDefaultAccountOptionResponseDto[];
}

export class TaxDefaultAccountOptionsResponseDto {
  @ApiProperty()
  companyId!: number;

  @ApiProperty({ type: [TaxDefaultAccountOptionGroupResponseDto] })
  groups!: TaxDefaultAccountOptionGroupResponseDto[];

  @ApiProperty({ type: [TaxDefaultAccountOptionResponseDto] })
  options!: TaxDefaultAccountOptionResponseDto[];
}
