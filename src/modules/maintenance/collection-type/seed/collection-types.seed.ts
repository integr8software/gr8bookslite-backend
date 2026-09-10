import { ChartAccountStatus, DefaultAccountTemplateType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StandardCollectionTypeTemplates } from './collection-type-defaults.seed';

type ChartAccountReference = {
  id: bigint;
  status: ChartAccountStatus;
};

export async function seedCompanyCollectionTypes(tx: Prisma.TransactionClient | PrismaService, companyId: number) {
  const copiedChartAccountByCode = new Map<string, ChartAccountReference>();
  const chartAccounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      accountCode: { in: StandardCollectionTypeTemplates.map((template) => template.revenueAccountCode) },
    },
    select: {
      id: true,
      accountCode: true,
      status: true,
    },
  });

  for (const account of chartAccounts) {
    copiedChartAccountByCode.set(account.accountCode, {
      id: account.id,
      status: account.status,
    });
  }

  for (const template of StandardCollectionTypeTemplates) {
    const revenueAccount = getCopiedTemplateAccount(copiedChartAccountByCode, template.revenueAccountCode, template.name);
    const templateStatus = revenueAccount.status === ChartAccountStatus.ACTIVE ? ChartAccountStatus.ACTIVE : ChartAccountStatus.INACTIVE;
    const templateDeletedAt = templateStatus === ChartAccountStatus.INACTIVE ? new Date() : null;

    await tx.defaultAccount.upsert({
      where: {
        companyId_type_name: {
          companyId,
          type: DefaultAccountTemplateType.COLLECTION,
          name: template.name,
        },
      },
      update: {
        description: template.name,
        status: templateStatus,
        expenseCoaId: null,
        revenueCoaId: revenueAccount.id,
        deletedAt: templateDeletedAt,
      },
      create: {
        companyId,
        type: DefaultAccountTemplateType.COLLECTION,
        name: template.name,
        description: template.name,
        status: templateStatus,
        expenseCoaId: null,
        revenueCoaId: revenueAccount.id,
        deletedAt: templateDeletedAt,
      },
    });
  }
}

function getCopiedTemplateAccount(copiedChartAccountByCode: Map<string, ChartAccountReference>, accountCode: string, templateName: string) {
  const account = copiedChartAccountByCode.get(accountCode);

  if (!account) {
    throw new Error(`Collection type ${templateName} references an account that was not copied: ${accountCode}.`);
  }

  return account;
}
