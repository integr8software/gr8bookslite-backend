import { ApiProperty } from '@nestjs/swagger';
import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountStatus,
  ChartAccountType,
} from '@prisma/client';

export class ChartAccountBankAccountResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty()
  coaId!: number;

  @ApiProperty()
  bankName!: string;

  @ApiProperty({ nullable: true })
  branch!: string | null;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;
}

export class ChartAccountResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ nullable: true })
  parentAccountId!: number | null;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty({ enum: ChartAccountLevel })
  accountLevel!: ChartAccountLevel;

  @ApiProperty({ enum: ChartAccountType, nullable: true })
  accountType!: ChartAccountType | null;

  @ApiProperty({ enum: AccountNature, nullable: true })
  accountNature!: AccountNature | null;

  @ApiProperty({ nullable: true })
  accountGroup!: string | null;

  @ApiProperty({ nullable: true })
  statementSection!: string | null;

  @ApiProperty({ nullable: true })
  reportAlias!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isPostingAccount!: boolean;

  @ApiProperty()
  withSubsidiary!: boolean;

  @ApiProperty()
  contraAccount!: boolean;

  @ApiProperty()
  showTotal!: boolean;

  @ApiProperty({ nullable: true })
  orderNo!: number | null;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ nullable: true })
  deletedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [ChartAccountBankAccountResponseDto] })
  bankAccounts!: ChartAccountBankAccountResponseDto[];
}

export class ChartAccountTreeNodeResponseDto extends ChartAccountResponseDto {
  @ApiProperty({ type: () => [ChartAccountTreeNodeResponseDto] })
  children!: ChartAccountTreeNodeResponseDto[];
}

export class ChartAccountListResponseDto {
  @ApiProperty({ type: [ChartAccountResponseDto] })
  accounts!: ChartAccountResponseDto[];
}

export class ChartAccountTreeResponseDto {
  @ApiProperty({ type: [ChartAccountTreeNodeResponseDto] })
  accounts!: ChartAccountTreeNodeResponseDto[];
}

export class ChartAccountContainerResponseDto {
  @ApiProperty({ type: ChartAccountResponseDto })
  account!: ChartAccountResponseDto;
}

export class ChartAccountSaveResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ChartAccountResponseDto })
  account!: ChartAccountResponseDto;
}

export class ChartAccountNextCodeResponseDto {
  @ApiProperty()
  accountCode!: string;
}
