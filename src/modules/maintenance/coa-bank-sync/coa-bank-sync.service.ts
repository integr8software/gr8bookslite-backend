import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountStatus,
  ChartAccountType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const BaseCurrencyCode = 'PHP';
const BankMasterfilePermissionCode = 'BM';
const CashInBankParentRole = 'CASH_IN_BANK_PARENT';

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
  accountGroup: string | null;
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
    const mappedAccount = await tx.companyDefaultAccount.findFirst({
      where: {
        companyId,
        moduleCode: BankMasterfilePermissionCode,
        accountRole: CashInBankParentRole,
        status: ChartAccountStatus.ACTIVE,
        chartAccount: {
          companyId,
          status: ChartAccountStatus.ACTIVE,
          deletedAt: null,
          accountLevel: ChartAccountLevel.SUB3,
        },
      },
      include: { chartAccount: true },
    });

    if (mappedAccount?.chartAccount) {
      return mappedAccount.chartAccount;
    }

    const accounts = await tx.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        accountLevel: { not: ChartAccountLevel.SPECIFIC },
        OR: [
          { accountTitle: { contains: 'cash', mode: 'insensitive' } },
          { accountTitle: { contains: 'bank', mode: 'insensitive' } },
          { accountGroup: { contains: 'cash', mode: 'insensitive' } },
          { accountGroup: { contains: 'bank', mode: 'insensitive' } },
          { statementSection: { contains: 'cash', mode: 'insensitive' } },
          { statementSection: { contains: 'bank', mode: 'insensitive' } },
          { reportAlias: { contains: 'cash', mode: 'insensitive' } },
          { reportAlias: { contains: 'bank', mode: 'insensitive' } },
          { description: { contains: 'cash', mode: 'insensitive' } },
          { description: { contains: 'bank', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ accountCode: 'asc' }],
    });

    return pickCashInBankParent(accounts);
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

type CashInBankCandidate = Pick<
  Prisma.ChartAccountGetPayload<object>,
  | 'accountTitle'
  | 'accountGroup'
  | 'statementSection'
  | 'reportAlias'
  | 'description'
>;

function pickCashInBankParent<T extends CashInBankCandidate>(accounts: T[]) {
  let bestAccount: T | null = null;
  let bestScore = 0;

  for (const account of accounts) {
    const score = scoreCashInBankCandidate(account);

    if (score > bestScore) {
      bestAccount = account;
      bestScore = score;
    }
  }

  return bestAccount;
}

function scoreCashInBankCandidate(account: CashInBankCandidate) {
  const labels = [
    account.accountTitle,
    account.accountGroup,
    account.statementSection,
    account.reportAlias,
    account.description,
  ].map(normalizeAccountLabel);

  if (labels.some((label) => label === 'cash in bank')) {
    return 100;
  }

  if (
    labels.some(
      (label) =>
        label.includes('cash in bank') || label.includes('cash in banks'),
    )
  ) {
    return 90;
  }

  if (
    labels.some((label) => label.includes('cash') && label.includes('bank'))
  ) {
    return 80;
  }

  return 0;
}

function normalizeAccountLabel(value: string | null) {
  return (
    value
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() ?? ''
  );
}

function cleanText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function cleanCurrencyCode(value: string | null | undefined) {
  return cleanText(value).toUpperCase() || null;
}
