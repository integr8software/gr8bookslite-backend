import { normalizeAccountGroupTags } from '../../chart-of-accounts/utils/system-account-groups.util';
import {
  resolveAuditUserNames,
  SystemGeneratedAuditLabel,
} from '../../../../common/utils/audit-user.util';
import type { AuditUserLookupClient } from '../../../../common/interfaces/audit-user-lookup-client.interface';
import type { BankAccountPayload } from '../types/bank-account.type';

export function mapBankAccount(
  bankAccount: BankAccountPayload,
  userNames: Map<number, string> = new Map(),
) {
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
    createdBy:
      bankAccount.createdByUserId === null
        ? SystemGeneratedAuditLabel
        : (userNames.get(bankAccount.createdByUserId) ?? null),
    createdAt: bankAccount.createdAt.toISOString(),
    updatedBy:
      (bankAccount.updatedByUserId &&
        userNames.get(bankAccount.updatedByUserId)) ??
      null,
    updatedAt: bankAccount.updatedAt.toISOString(),
    createdByUserId: bankAccount.createdByUserId,
    updatedByUserId: bankAccount.updatedByUserId,
  };
}

export async function mapBankAccountsWithAuditUsers(
  prisma: AuditUserLookupClient,
  bankAccounts: BankAccountPayload[],
) {
  const userNames = await resolveAuditUserNames(
    prisma,
    bankAccounts.flatMap((bankAccount) => [
      bankAccount.createdByUserId,
      bankAccount.updatedByUserId,
    ]),
  );

  return bankAccounts.map((bankAccount) =>
    mapBankAccount(bankAccount, userNames),
  );
}
