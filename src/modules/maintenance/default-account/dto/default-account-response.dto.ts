import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountLevel, ChartAccountStatus, ChartAccountType, AccountNature, DefaultAccountTemplateType } from '@prisma/client';

export class GeneratedDefaultAccountResponseDto {
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

export class DefaultAccountResponseDto {
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

  @ApiProperty({ type: [GeneratedDefaultAccountResponseDto] })
  generatedAccounts!: GeneratedDefaultAccountResponseDto[];

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class DefaultAccountStatisticsResponseDto {
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

export class DefaultAccountPermissionsResponseDto {
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

export class DefaultAccountPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class DefaultAccountListResponseDto {
  @ApiProperty({ type: [DefaultAccountResponseDto] })
  defaultAccounts!: DefaultAccountResponseDto[];

  @ApiProperty({ type: DefaultAccountStatisticsResponseDto })
  statistics!: DefaultAccountStatisticsResponseDto;

  @ApiProperty({ type: DefaultAccountPaginationResponseDto })
  pagination!: DefaultAccountPaginationResponseDto;

  @ApiProperty({ type: DefaultAccountPermissionsResponseDto })
  permissions!: DefaultAccountPermissionsResponseDto;
}

export class DefaultAccountContainerResponseDto {
  @ApiProperty({ type: DefaultAccountResponseDto })
  defaultAccount!: DefaultAccountResponseDto;

  @ApiProperty({ type: DefaultAccountPermissionsResponseDto })
  permissions!: DefaultAccountPermissionsResponseDto;
}

export class DefaultAccountExpenseParentOptionResponseDto {
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

export class DefaultAccountExpenseParentOptionsResponseDto {
  @ApiProperty({ type: [DefaultAccountExpenseParentOptionResponseDto] })
  options!: DefaultAccountExpenseParentOptionResponseDto[];
}

export class DefaultAccountOptionResponseDto {
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

export class DefaultAccountOptionsResponseDto {
  @ApiProperty({ type: [DefaultAccountOptionResponseDto] })
  options!: DefaultAccountOptionResponseDto[];
}

export class CreateDefaultAccountExpenseSubAccountResponseDto {
  @ApiProperty()
  id!: string;
}

export class SaveDefaultAccountExpenseSubAccountResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CreateDefaultAccountExpenseSubAccountResponseDto })
  account!: CreateDefaultAccountExpenseSubAccountResponseDto;
}

export class SaveDefaultAccountResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: DefaultAccountResponseDto })
  defaultAccount!: DefaultAccountResponseDto;
}
