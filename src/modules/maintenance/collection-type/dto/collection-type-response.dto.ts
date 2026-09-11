import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountStatus, ChartAccountType, AccountNature, DefaultAccountTemplateType, ServiceAccountSetupMode } from '@prisma/client';

export class GeneratedCollectionTypeResponseDto {
  @ApiProperty({ enum: ['EXPENSE', 'REVENUE'] })
  role!: 'EXPENSE' | 'REVENUE';

  @ApiProperty()
  chartAccountId!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty({ enum: ChartAccountType, nullable: true })
  accountType!: ChartAccountType | null;

  @ApiProperty({ enum: AccountNature, nullable: true })
  accountNature!: AccountNature | null;

  @ApiProperty({ nullable: true })
  parentAccountId!: string | null;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;
}

export class CollectionTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ enum: DefaultAccountTemplateType })
  type!: DefaultAccountTemplateType;

  @ApiProperty()
  defaultAccountName!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;

  @ApiProperty({ enum: ServiceAccountSetupMode })
  accountSetupMode!: ServiceAccountSetupMode;

  @ApiProperty({ nullable: true })
  expenseParentCoaId!: string | null;

  @ApiProperty({ nullable: true })
  revenueCoaId!: string | null;

  @ApiProperty({ type: [GeneratedCollectionTypeResponseDto] })
  generatedAccounts!: GeneratedCollectionTypeResponseDto[];

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class CollectionTypeStatisticsResponseDto {
  @ApiProperty()
  totalDefaultAccounts!: number;

  @ApiProperty()
  activeDefaultAccounts!: number;

  @ApiProperty()
  inactiveDefaultAccounts!: number;

  @ApiProperty()
  expenseDefaultAccounts!: number;

  @ApiProperty()
  collectionDefaultAccounts!: number;
}

export class CollectionTypePermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canCancel!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiPropertyOptional()
  canImport?: boolean;
}

export class CollectionTypePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CollectionTypeListResponseDto {
  @ApiProperty({ type: [CollectionTypeResponseDto] })
  defaultAccounts!: CollectionTypeResponseDto[];

  @ApiProperty({ type: CollectionTypeStatisticsResponseDto })
  statistics!: CollectionTypeStatisticsResponseDto;

  @ApiProperty({ type: CollectionTypePaginationResponseDto })
  pagination!: CollectionTypePaginationResponseDto;

  @ApiProperty({ type: CollectionTypePermissionsResponseDto })
  permissions!: CollectionTypePermissionsResponseDto;
}

export class CollectionTypeContainerResponseDto {
  @ApiProperty({ type: CollectionTypeResponseDto })
  defaultAccount!: CollectionTypeResponseDto;

  @ApiProperty({ type: CollectionTypePermissionsResponseDto })
  permissions!: CollectionTypePermissionsResponseDto;
}

export class CollectionTypeOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: DefaultAccountTemplateType })
  type!: DefaultAccountTemplateType;

  @ApiProperty()
  defaultAccountName!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;

  @ApiProperty({ nullable: true })
  chartAccountId!: string | null;

  @ApiProperty({ nullable: true })
  accountCode!: string | null;

  @ApiProperty({ nullable: true })
  accountTitle!: string | null;

  @ApiProperty({ enum: ChartAccountType, nullable: true })
  accountType!: ChartAccountType | null;

  @ApiProperty({ enum: AccountNature, nullable: true })
  accountNature!: AccountNature | null;
}

export class CollectionTypeOptionsResponseDto {
  @ApiProperty({ type: [CollectionTypeOptionResponseDto] })
  options!: CollectionTypeOptionResponseDto[];
}

export class CollectionTypeAccountOptionResponseDto {
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

  @ApiProperty()
  normalBalance!: string;

  @ApiProperty()
  accountCategory!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  status!: string;
}

export class CollectionTypeAccountOptionsResponseDto {
  @ApiProperty({ type: [CollectionTypeAccountOptionResponseDto] })
  accounts!: CollectionTypeAccountOptionResponseDto[];
}

export class SaveCollectionTypeResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CollectionTypeResponseDto })
  defaultAccount!: CollectionTypeResponseDto;
}
