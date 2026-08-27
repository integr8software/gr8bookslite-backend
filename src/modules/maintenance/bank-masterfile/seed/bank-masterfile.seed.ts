import { BankAccountType, ChartAccountLevel, ChartAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { findSystemAccountGroupOrThrow, SystemAccountGroups } from '../../chart-of-accounts/utils/system-account-groups.util';

const CashInBankSpecificPrefix = 'Cash in Bank - ';

export async function seedCompanyBankAccountDefaults(tx: Prisma.TransactionClient | PrismaService, companyId: number) {
  const cashInBankParent = await findSystemAccountGroupOrThrow(tx, companyId, SystemAccountGroups.bankMasterfile.cashInBankParent);

  const cashInBankAccounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      parentAccountId: cashInBankParent.id,
      accountLevel: ChartAccountLevel.SPECIFIC,
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
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        status: true,
      },
    });

    if (existingBank) {
      if (
        existingBank.status === ChartAccountStatus.INACTIVE ||
        !existingBank.accountNumber ||
        !existingBank.accountName ||
        (existingBank.accountNumber === account.accountCode && existingBank.accountName === account.accountTitle)
      ) {
        await tx.chartAccount.update({
          where: { id: account.id },
          data: { status: ChartAccountStatus.INACTIVE, deletedAt: new Date() },
        });
        await tx.bankAccount.update({
          where: { id: existingBank.id },
          data: {
            accountName: '',
            accountNumber: '',
            status: ChartAccountStatus.INACTIVE,
          },
        });
      }

      continue;
    }

    const bankName = account.accountTitle.slice(CashInBankSpecificPrefix.length).trim();

    if (!bankName) {
      continue;
    }

    await tx.chartAccount.update({
      where: { id: account.id },
      data: { status: ChartAccountStatus.INACTIVE, deletedAt: new Date() },
    });

    await tx.bankAccount.create({
      data: {
        companyId,
        coaId: account.id,
        bankName,
        accountNumber: '',
        accountName: '',
        accountType: BankAccountType.CHECKING,
        currencyCode: account.currencyCode,
        isDefault: false,
        status: ChartAccountStatus.INACTIVE,
      },
    });
    createdCount += 1;
  }

  return createdCount;
}
