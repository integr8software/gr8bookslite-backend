import { ChartAccountLevel, ChartAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const BankMasterfileModuleCode = 'BM';
const CashInBankParentRole = 'CASH_IN_BANK_PARENT';
const CashInBankSpecificPrefix = 'Cash in Bank - ';
const DefaultCurrencyCode = 'PHP';

export async function seedDefaultBankAccountsForCompany(
  tx: Prisma.TransactionClient | PrismaService,
  companyId: number,
) {
  const cashInBankParent = await tx.companyDefaultAccount.findFirst({
    where: {
      companyId,
      moduleCode: BankMasterfileModuleCode,
      accountRole: CashInBankParentRole,
      status: ChartAccountStatus.ACTIVE,
      chartAccount: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
    },
    include: { chartAccount: true },
  });

  if (!cashInBankParent) {
    return 0;
  }

  const cashInBankAccounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      parentAccountId: cashInBankParent.chartAccountId,
      accountLevel: ChartAccountLevel.SPECIFIC,
      status: ChartAccountStatus.ACTIVE,
      deletedAt: null,
      accountTitle: {
        startsWith: CashInBankSpecificPrefix,
        mode: 'insensitive',
      },
    },
    orderBy: { accountCode: 'asc' },
  });

  let createdCount = 0;

  for (const account of cashInBankAccounts) {
    const existingBank = await tx.bankAccount.findFirst({
      where: {
        companyId,
        coaId: account.id,
      },
      select: { id: true },
    });

    if (existingBank) {
      continue;
    }

    const bankName = account.accountTitle
      .slice(CashInBankSpecificPrefix.length)
      .trim();

    if (!bankName) {
      continue;
    }

    await tx.bankAccount.create({
      data: {
        companyId,
        coaId: account.id,
        bankName,
        accountNumber: account.accountCode,
        accountName: account.accountTitle,
        accountType: 'Checking',
        currencyCode: account.currencyCode ?? DefaultCurrencyCode,
        isDefault: false,
        status: account.status,
      },
    });
    createdCount += 1;
  }

  return createdCount;
}
