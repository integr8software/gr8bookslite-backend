import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountLevel, ChartAccountStatus, ChartAccountType, AccountNature, DefaultAccountTemplateType } from '@prisma/client';

export class GeneratedDisbursementTypeResponseDto {
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

export class DisbursementTypeResponseDto {
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

  @ApiProperty({ nullable: true })
  expenseParentCoaId!: string | null;

  @ApiProperty({ type: [GeneratedDisbursementTypeResponseDto] })
  generatedAccounts!: GeneratedDisbursementTypeResponseDto[];

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class DisbursementTypeStatisticsResponseDto {
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

export class DisbursementTypePermissionsResponseDto {
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

export class DisbursementTypePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class DisbursementTypeListResponseDto {
  @ApiProperty({ type: [DisbursementTypeResponseDto] })
  defaultAccounts!: DisbursementTypeResponseDto[];

  @ApiProperty({ type: DisbursementTypeStatisticsResponseDto })
  statistics!: DisbursementTypeStatisticsResponseDto;

  @ApiProperty({ type: DisbursementTypePaginationResponseDto })
  pagination!: DisbursementTypePaginationResponseDto;

  @ApiProperty({ type: DisbursementTypePermissionsResponseDto })
  permissions!: DisbursementTypePermissionsResponseDto;
}

export class DisbursementTypeContainerResponseDto {
  @ApiProperty({ type: DisbursementTypeResponseDto })
  defaultAccount!: DisbursementTypeResponseDto;

  @ApiProperty({ type: DisbursementTypePermissionsResponseDto })
  permissions!: DisbursementTypePermissionsResponseDto;
}

export class DisbursementTypeExpenseParentOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty({ enum: ChartAccountLevel })
  accountLevel!: ChartAccountLevel;

  @ApiProperty({ nullable: true })
  parentAccountId!: string | null;
}

export class DisbursementTypeExpenseParentOptionsResponseDto {
  @ApiProperty({ type: [DisbursementTypeExpenseParentOptionResponseDto] })
  options!: DisbursementTypeExpenseParentOptionResponseDto[];
}

export class DisbursementTypeAccountOptionResponseDto {
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

export class DisbursementTypeAccountOptionsResponseDto {
  @ApiProperty({ type: [DisbursementTypeAccountOptionResponseDto] })
  accounts!: DisbursementTypeAccountOptionResponseDto[];
}

export class DisbursementTypeOptionResponseDto {
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

export class DisbursementTypeOptionsResponseDto {
  @ApiProperty({ type: [DisbursementTypeOptionResponseDto] })
  options!: DisbursementTypeOptionResponseDto[];
}

export class CreateDefaultAccountExpenseSubAccountResponseDto {
  @ApiProperty()
  id!: string;
}

export class SaveDisbursementTypeExpenseSubAccountResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CreateDefaultAccountExpenseSubAccountResponseDto })
  account!: CreateDefaultAccountExpenseSubAccountResponseDto;
}

export class SaveDisbursementTypeResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: DisbursementTypeResponseDto })
  defaultAccount!: DisbursementTypeResponseDto;
}
