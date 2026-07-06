import { ChartAccountLevel, ChartAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const BankMasterfileModuleCode = 'BM';
const CashInBankParentRole = 'CASH_IN_BANK_PARENT';
const CashInBankSpecificPrefix = 'Cash in Bank - ';

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
        (existingBank.accountNumber === account.accountCode &&
          existingBank.accountName === account.accountTitle)
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

    const bankName = account.accountTitle
      .slice(CashInBankSpecificPrefix.length)
      .trim();

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
        accountType: 'Checking',
        currencyCode: account.currencyCode,
        isDefault: false,
        status: ChartAccountStatus.INACTIVE,
      },
    });
    createdCount += 1;
  }

  return createdCount;
}
