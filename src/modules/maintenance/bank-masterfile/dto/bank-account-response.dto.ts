import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType, ChartAccountStatus } from '@prisma/client';

export class BankChartAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty({ type: [String] })
  accountGroup!: string[];

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;
}

export class BankAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: number;

  @ApiProperty()
  coaId!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  bankName!: string;

  @ApiProperty({ nullable: true })
  branch!: string | null;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty({ enum: BankAccountType, nullable: true })
  accountType!: BankAccountType | null;

  @ApiProperty({ nullable: true })
  seriesStart!: string | null;

  @ApiProperty({ nullable: true })
  seriesEnd!: string | null;

  @ApiProperty({ nullable: true })
  seriesDigits!: number | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;

  @ApiProperty({ type: BankChartAccountResponseDto })
  chartAccount!: BankChartAccountResponseDto;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class BankAccountOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bankName!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty()
  maskedAccountNumber!: string;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;
}

export class BankMasterfileStatisticsResponseDto {
  @ApiProperty()
  totalBanks!: number;

  @ApiProperty()
  activeBanks!: number;

  @ApiProperty()
  inactiveBanks!: number;

  @ApiProperty()
  defaultBanks!: number;
}

export class BankMasterfilePermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiPropertyOptional()
  canImport?: boolean;
}

export class BankMasterfilePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BankAccountListResponseDto {
  @ApiProperty({ type: [BankAccountResponseDto] })
  bankAccounts!: BankAccountResponseDto[];

  @ApiProperty({ type: BankMasterfileStatisticsResponseDto })
  statistics!: BankMasterfileStatisticsResponseDto;

  @ApiProperty({ type: BankMasterfilePaginationResponseDto })
  pagination!: BankMasterfilePaginationResponseDto;

  @ApiProperty({ type: BankMasterfilePermissionsResponseDto })
  permissions!: BankMasterfilePermissionsResponseDto;
}

export class BankAccountOptionsResponseDto {
  @ApiProperty({ type: [BankAccountOptionResponseDto] })
  banks!: BankAccountOptionResponseDto[];
}

export class BankAccountContainerResponseDto {
  @ApiProperty({ type: BankAccountResponseDto })
  bankAccount!: BankAccountResponseDto;

  @ApiProperty({ type: BankMasterfilePermissionsResponseDto })
  permissions!: BankMasterfilePermissionsResponseDto;
}

export class BankNextAccountCodeResponseDto {
  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  parentAccountCode!: string;

  @ApiProperty()
  parentAccountTitle!: string;
}

export class SaveBankAccountResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: BankAccountResponseDto })
  bankAccount!: BankAccountResponseDto;
}

export class ImportBankAccountsResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [BankAccountResponseDto] })
  bankAccounts!: BankAccountResponseDto[];
}
