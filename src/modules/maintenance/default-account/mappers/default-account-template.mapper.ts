import type { Prisma } from '@prisma/client';
import { DefaultAccountTemplateInclude } from '../prisma/default-account-template.include';

export type DefaultAccountTemplatePayload =
  Prisma.DefaultAccountTemplateGetPayload<{
    include: typeof DefaultAccountTemplateInclude;
  }>;

export function mapDefaultAccountTemplate(
  template: DefaultAccountTemplatePayload,
) {
  return {
    id: template.id.toString(),
    companyId: template.companyId,
    type: template.type,
    description: template.description,
    status: template.status,
    generatedAccounts: [
      mapGeneratedAccount(
        template.type === 'FIXED_ASSET' ? 'DEPRECIATION_EXPENSE' : 'EXPENSE',
        template.expenseCoa,
      ),
      mapGeneratedAccount('REVENUE', template.revenueCoa),
      mapGeneratedAccount('FIXED_ASSET', template.assetCoa),
      mapGeneratedAccount(
        'ACCUMULATED_DEPRECIATION',
        template.accumulatedDepreciationCoa,
      ),
    ].filter(Boolean),
    createdByUserId: template.createdByUserId,
    updatedByUserId: template.updatedByUserId,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function mapGeneratedAccount(role: string, account: GeneratedAccount | null) {
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

type GeneratedAccount = NonNullable<
  DefaultAccountTemplatePayload['expenseCoa']
>;
