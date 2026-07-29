import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { DefaultAccountPayload, GeneratedDefaultAccount } from '../types/default-account.type';

export function mapDefaultAccount(template: DefaultAccountPayload, userNames: Map<number, string> = new Map()) {
  return {
    id: template.id.toString(),
    companyId: template.companyId,
    type: template.type,
    defaultAccountName: template.name,
    description: template.description ?? '',
    status: template.status,
    expenseParentCoaId: template.type === 'EXPENSE' ? (template.expenseCoa?.parentAccountId?.toString() ?? null) : null,
    generatedAccounts: [
      mapGeneratedAccount('EXPENSE', template.expenseCoa),
      mapGeneratedAccount('REVENUE', template.revenueCoa),
    ].filter(Boolean),
    createdBy: template.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(template.createdByUserId) ?? null),
    createdAt: template.createdAt.toISOString(),
    updatedBy: (template.updatedByUserId && userNames.get(template.updatedByUserId)) ?? null,
    updatedAt: template.updatedAt.toISOString(),
    createdByUserId: template.createdByUserId,
    updatedByUserId: template.updatedByUserId,
  };
}

function mapGeneratedAccount(role: string, account: GeneratedDefaultAccount | null) {
  if (!account) {
    return null;
  }

  return {
    role,
    chartAccountId: account.id.toString(),
    accountCode: account.accountCode,
    accountTitle: account.accountTitle,
    accountType: account.accountType,
    accountNature: account.accountNature,
    parentAccountId: account.parentAccountId?.toString() ?? null,
    status: account.status,
  };
}
