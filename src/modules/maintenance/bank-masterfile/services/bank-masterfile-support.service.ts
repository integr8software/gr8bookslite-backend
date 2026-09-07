import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ChartAccountLevel, ChartAccountStatus } from '@prisma/client';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
import { cleanOptional } from '../../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ChartAccountBankSyncService } from '../../chart-of-accounts/services/chart-account-bank-sync.service';
import { generateNextAccountCodeFromSiblings } from '../../chart-of-accounts/utils/chart-account-code.util';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';
import { BankAccountInclude } from '../prisma/bank-account.include';
import type { BankMasterfilePrismaClient } from '../types/bank-account.type';
import { getBankAccountIdentityKey } from '../utils/bank-account-data.util';

@Injectable()
export class BankMasterfileSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chartAccountBankSyncService: ChartAccountBankSyncService,
  ) {}

  async getStatistics(companyId: number) {
    const [groups, defaultBanks] = await Promise.all([
      this.prisma.bankAccount.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),
      this.prisma.bankAccount.count({ where: { companyId, isDefault: true } }),
    ]);

    return {
      totalBanks: groups.reduce((total, group) => total + group._count._all, 0),
      activeBanks: groups.find((group) => group.status === ChartAccountStatus.ACTIVE)?._count._all ?? 0,
      inactiveBanks: groups.find((group) => group.status === ChartAccountStatus.INACTIVE)?._count._all ?? 0,
      defaultBanks,
    };
  }

  findCashInBankParentOrThrow(companyId: number, tx: BankMasterfilePrismaClient = this.prisma) {
    return this.chartAccountBankSyncService.findCashInBankParentOrThrow(companyId, tx);
  }

  async generateNextCashInBankAccountCode(companyId: number, parentAccountId: bigint, parentAccountCode: string, tx: BankMasterfilePrismaClient) {
    const siblings = await tx.chartAccount.findMany({
      where: {
        companyId,
        parentAccountId,
        accountLevel: ChartAccountLevel.SPECIFIC,
      },
      select: { accountCode: true },
      orderBy: { accountCode: 'asc' },
    });

    return generateNextAccountCodeFromSiblings({
      parentCode: parentAccountCode,
      accountLevel: ChartAccountLevel.SPECIFIC,
      siblingCodes: siblings.map((sibling) => sibling.accountCode),
    });
  }

  async validateManualAccountCode(companyId: number, accountCode: string, tx: BankMasterfilePrismaClient) {
    const normalizedAccountCode = accountCode.trim();
    const existingAccount = await tx.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: normalizedAccountCode,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException('A chart account with this account code already exists.');
    }

    return normalizedAccountCode;
  }

  async isAccountCodeTaken(companyId: number, accountCode: string, tx: BankMasterfilePrismaClient = this.prisma) {
    const normalizedAccountCode = accountCode.trim();
    const existingAccount = await tx.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: normalizedAccountCode,
        deletedAt: null,
      },
      select: { id: true },
    });

    return Boolean(existingAccount);
  }

  async ensureBankAccountAvailable(companyId: number, dto: CreateBankAccountDto | UpdateBankAccountDto, excludedBankAccountId?: bigint) {
    if (!dto.bankName || !dto.accountNumber) {
      return;
    }

    const existingBankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        companyId,
        id: excludedBankAccountId ? { not: excludedBankAccountId } : undefined,
        bankName: { equals: dto.bankName.trim(), mode: 'insensitive' },
        accountNumber: {
          equals: dto.accountNumber.trim(),
          mode: 'insensitive',
        },
        ...(cleanOptional(dto.branch) === null ? { branch: null } : { branch: { equals: dto.branch?.trim(), mode: 'insensitive' } }),
      },
      select: { id: true },
    });

    if (existingBankAccount) {
      throw new ConflictException('A bank account with the same bank, branch, and account number already exists.');
    }
  }

  async ensureImportedBankAccountsAvailable(companyId: number, banks: CreateBankAccountDto[]) {
    const importKeys = new Set(banks.map(getBankAccountIdentityKey));
    const existingBankAccounts = await this.prisma.bankAccount.findMany({
      where: { companyId },
      select: {
        bankName: true,
        branch: true,
        accountNumber: true,
      },
    });
    const existingBankAccount = existingBankAccounts.find((bank) => importKeys.has(getBankAccountIdentityKey(bank)));

    if (existingBankAccount) {
      throw new ConflictException(`Bank account already exists: ${existingBankAccount.bankName} ${existingBankAccount.accountNumber}.`);
    }
  }

  async ensureImportedAccountCodesAvailable(companyId: number, banks: CreateBankAccountDto[]) {
    const accountCodes = banks.map((bank) => bank.accountCode?.trim()).filter((accountCode): accountCode is string => Boolean(accountCode));

    if (accountCodes.length === 0) {
      return;
    }

    const existingAccount = await this.prisma.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: { in: accountCodes },
        deletedAt: null,
      },
      select: { accountCode: true },
    });

    if (existingAccount) {
      throw new ConflictException(`Chart account code already exists: ${existingAccount.accountCode}.`);
    }
  }

  findBankAccountOrThrow(companyId: number, id: string | bigint) {
    const bankAccountId = typeof id === 'bigint' ? id : parsePositiveBigIntId(id);

    return this.prisma.bankAccount
      .findFirst({
        where: { id: bankAccountId, companyId },
        include: BankAccountInclude,
      })
      .then((bankAccount) => {
        if (!bankAccount) {
          throw new NotFoundException('Bank account not found.');
        }

        return bankAccount;
      });
  }
}
