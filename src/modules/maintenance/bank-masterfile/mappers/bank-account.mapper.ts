import type { Prisma } from '@prisma/client';
import { normalizeAccountGroupTags } from '../../chart-of-accounts/utils/system-account-groups.util';
import { BankAccountInclude } from '../prisma/bank-account.include';

export type BankAccountPayload = Prisma.BankAccountGetPayload<{
  include: typeof BankAccountInclude;
}>;

export function mapBankAccount(bankAccount: BankAccountPayload) {
  return {
    id: bankAccount.id.toString(),
    companyId: bankAccount.companyId,
    coaId: bankAccount.coaId.toString(),
    accountCode: bankAccount.coa.accountCode,
    bankName: bankAccount.bankName,
    branch: bankAccount.branch,
    accountNumber: bankAccount.accountNumber,
    accountName: bankAccount.accountName,
    accountType: bankAccount.accountType,
    seriesStart: bankAccount.seriesStart,
    seriesEnd: bankAccount.seriesEnd,
    seriesDigits: bankAccount.seriesDigits,
    currencyCode: bankAccount.currencyCode,
    currencyExchangeRate: bankAccount.currencyExchangeRate?.toString() ?? null,
    isDefault: bankAccount.isDefault,
    status: bankAccount.status,
    chartAccount: {
      id: bankAccount.coa.id.toString(),
      accountCode: bankAccount.coa.accountCode,
      accountTitle: bankAccount.coa.accountTitle,
      accountGroup: normalizeAccountGroupTags(bankAccount.coa.accountGroup),
      status: bankAccount.coa.status,
    },
    createdByUserId: bankAccount.createdByUserId,
    updatedByUserId: bankAccount.updatedByUserId,
    createdAt: bankAccount.createdAt.toISOString(),
    updatedAt: bankAccount.updatedAt.toISOString(),
  };
}
