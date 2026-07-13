import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountType,
  Prisma,
} from '@prisma/client';
import { cleanCurrencyCode } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  findSystemAccountGroupOrThrow,
  SystemAccountGroups,
} from '../chart-of-accounts/utils/system-account-groups.util';

const BaseCurrencyCode = 'PHP';

type PrismaClientLike = Prisma.TransactionClient | PrismaService;

type ChartAccountForSync = {
  id: bigint;
  companyId: number;
  parentAccountId: bigint | null;
  accountCode: string | null;
  accountTitle: string | null;
  accountLevel: ChartAccountLevel;
  accountType: ChartAccountType | null;
  accountNature: AccountNature | null;
  accountGroup: Prisma.JsonValue | null;
  isPostingAccount: boolean;
  currencyCode: string | null;
};

type BankAccountForSync = {
  id: bigint;
  companyId: number;
  coaId: bigint;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  branch: string | null;
  currencyCode: string | null;
  currencyExchangeRate: Prisma.Decimal | number | string | null;
};

@Injectable()
export class CoaBankSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async findCashInBankParent(
    companyId: number,
    tx: PrismaClientLike = this.prisma,
  ) {
    return findSystemAccountGroupOrThrow(
      tx,
      companyId,
      SystemAccountGroups.bankMasterfile.cashInBankParent,
    );
  }

  async findCashInBankParentOrThrow(
    companyId: number,
    tx: PrismaClientLike = this.prisma,
  ) {
    const cashInBankParent = await this.findCashInBankParent(companyId, tx);

    if (!cashInBankParent) {
      throw new BadRequestException(
        'Cannot activate bank account. Cash in Banks was not found in Chart of Accounts.',
      );
    }

    return cashInBankParent;
  }

  async isCashInBankPostingAccount(
    companyId: number,
    account: ChartAccountForSync,
    tx: PrismaClientLike = this.prisma,
  ) {
    if (
      account.companyId !== companyId ||
      account.accountLevel !== ChartAccountLevel.SPECIFIC ||
      !account.parentAccountId
    ) {
      return false;
    }

    const cashInBankParent = await this.findCashInBankParent(companyId, tx);

    return cashInBankParent?.id === account.parentAccountId;
  }

  async validateLinkedPairOrThrow({
    companyId,
    bankAccount,
    chartAccount,
    tx = this.prisma,
  }: {
    companyId: number;
    bankAccount: BankAccountForSync | null | undefined;
    chartAccount: ChartAccountForSync | null | undefined;
    tx?: PrismaClientLike;
  }) {
    if (
      !bankAccount ||
      !chartAccount ||
      bankAccount.coaId !== chartAccount.id
    ) {
      throw new BadRequestException(
        'Cannot activate bank account. Bank Masterfile and Chart of Accounts are not linked.',
      );
    }

    this.validateBankMasterfileOrThrow(bankAccount);
    await this.validateChartAccountOrThrow(companyId, chartAccount, tx);
    this.validateCurrencyMatchOrThrow(bankAccount, chartAccount);
  }

  private validateBankMasterfileOrThrow(bankAccount: BankAccountForSync) {
    const bankCurrencyCode = cleanCurrencyCode(bankAccount.currencyCode);

    if (
      !cleanText(bankAccount.bankName) ||
      !cleanText(bankAccount.accountName) ||
      !cleanText(bankAccount.accountNumber) ||
      !cleanText(bankAccount.accountType) ||
      !bankCurrencyCode
    ) {
      throw new BadRequestException(
        'Cannot activate bank account. Bank Masterfile information is incomplete.',
      );
    }

    if (
      bankCurrencyCode !== BaseCurrencyCode &&
      (!bankAccount.currencyExchangeRate ||
        Number(bankAccount.currencyExchangeRate) <= 0)
    ) {
      throw new BadRequestException(
        'Cannot activate bank account. Bank Masterfile information is incomplete.',
      );
    }
  }

  private async validateChartAccountOrThrow(
    companyId: number,
    chartAccount: ChartAccountForSync,
    tx: PrismaClientLike,
  ) {
    const cashInBankParent = await this.findCashInBankParentOrThrow(
      companyId,
      tx,
    );

    if (
      chartAccount.companyId !== companyId ||
      chartAccount.parentAccountId !== cashInBankParent.id ||
      !cleanText(chartAccount.accountCode) ||
      !cleanText(chartAccount.accountTitle) ||
      chartAccount.accountLevel !== ChartAccountLevel.SPECIFIC ||
      chartAccount.accountType !== ChartAccountType.ASSET ||
      chartAccount.accountNature !== AccountNature.DEBIT ||
      chartAccount.isPostingAccount !== true
    ) {
      throw new BadRequestException(
        'Cannot activate bank account. The linked Chart of Accounts posting account is incomplete.',
      );
    }
  }

  private validateCurrencyMatchOrThrow(
    bankAccount: BankAccountForSync,
    chartAccount: ChartAccountForSync,
  ) {
    const bankCurrencyCode = cleanCurrencyCode(bankAccount.currencyCode);
    const chartCurrencyCode = cleanCurrencyCode(chartAccount.currencyCode);

    if (chartCurrencyCode && bankCurrencyCode !== chartCurrencyCode) {
      throw new BadRequestException(
        'Cannot activate bank account. The linked Chart of Accounts posting account is incomplete.',
      );
    }
  }
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}
