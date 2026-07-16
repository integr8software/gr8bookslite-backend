import { normalizeAccountGroupTags } from '../utils/system-account-groups.util';
import { parseAuditUserId, SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { ChartAccountPayload, ChartAccountResponse, ChartAccountTreePayload, ChartAccountTreeResponse } from '../types/chart-account.type';

export function mapChartAccount(account: ChartAccountPayload, userNames: Map<number, string> = new Map()): ChartAccountResponse {
  const createdByUserId = parseAuditUserId(account.whoCreated);
  const updatedByUserId = parseAuditUserId(account.whoModified);

  return {
    id: Number(account.id),
    companyId: account.companyId,
    parentAccountId: account.parentAccountId === null ? null : Number(account.parentAccountId),
    accountCode: account.accountCode,
    accountTitle: account.accountTitle,
    accountLevel: account.accountLevel,
    accountType: account.accountType,
    accountNature: account.accountNature,
    accountGroup: normalizeAccountGroupTags(account.accountGroup),
    statementSection: account.statementSection,
    reportAlias: account.reportAlias,
    description: account.description,
    isPostingAccount: account.isPostingAccount,
    withSubsidiary: account.withSubsidiary,
    contraAccount: account.contraAccount,
    showTotal: account.showTotal,
    orderNo: account.orderNo,
    status: account.status,
    currencyCode: account.currencyCode,
    isSystemDefault: !account.whoCreated,
    isUserCreated: Boolean(account.whoCreated),
    isBankLinked: account.bankAccounts.length > 0,
    deletedAt: account.deletedAt?.toISOString() ?? null,
    createdBy: createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(createdByUserId) ?? null),
    createdAt: account.createdAt.toISOString(),
    updatedBy: updatedByUserId === null ? null : (userNames.get(updatedByUserId) ?? null),
    updatedAt: account.updatedAt.toISOString(),
    bankAccounts: account.bankAccounts.map((bankAccount) => ({
      id: Number(bankAccount.id),
      companyId: bankAccount.companyId,
      coaId: Number(bankAccount.coaId),
      bankName: bankAccount.bankName,
      branch: bankAccount.branch,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      currencyCode: bankAccount.currencyCode,
      isDefault: bankAccount.isDefault,
      status: bankAccount.status,
    })),
  };
}

export function mapChartAccountTreeNode(account: ChartAccountTreePayload, userNames: Map<number, string> = new Map()): ChartAccountTreeResponse {
  return {
    ...mapChartAccount(account, userNames),
    children: (account.children ?? []).map((child) => mapChartAccountTreeNode(child, userNames)),
  };
}

export function parseChartAccountAuditUserId(value: string | null) {
  return parseAuditUserId(value);
}
