import { ChartAccountStatus, DefaultAccountTemplateType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StandardDisbursementTypeTemplates } from './disbursement-type-defaults.seed';

type ChartAccountReference = {
  id: bigint;
  status: ChartAccountStatus;
};

export async function seedCompanyDisbursementTypes(tx: Prisma.TransactionClient | PrismaService, companyId: number) {
  const copiedChartAccountByCode = new Map<string, ChartAccountReference>();
  const accountCodes = StandardDisbursementTypeTemplates.map((template) => template.expenseAccountCode);
  const chartAccounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      accountCode: { in: accountCodes },
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

  for (const template of StandardDisbursementTypeTemplates) {
    const expenseAccount = getCopiedTemplateAccount(copiedChartAccountByCode, template.expenseAccountCode, template.name);
    const templateStatus = expenseAccount.status === ChartAccountStatus.ACTIVE
      ? ChartAccountStatus.ACTIVE
      : ChartAccountStatus.INACTIVE;
    const templateDeletedAt = templateStatus === ChartAccountStatus.INACTIVE ? new Date() : null;

    await tx.defaultAccount.upsert({
      where: {
        companyId_type_name: {
          companyId,
          type: DefaultAccountTemplateType.EXPENSE,
          name: template.name,
        },
      },
      update: {
        description: template.name,
        status: templateStatus,
        expenseCoaId: expenseAccount.id,
        revenueCoaId: null,
        deletedAt: templateDeletedAt,
      },
      create: {
        companyId,
        type: DefaultAccountTemplateType.EXPENSE,
        name: template.name,
        description: template.name,
        status: templateStatus,
        expenseCoaId: expenseAccount.id,
        revenueCoaId: null,
        deletedAt: templateDeletedAt,
      },
    });
  }
}

function getCopiedTemplateAccount(copiedChartAccountByCode: Map<string, ChartAccountReference>, accountCode: string, templateName: string) {
  const account = copiedChartAccountByCode.get(accountCode);

  if (!account) {
    throw new Error(`Disbursement type ${templateName} references an account that was not copied: ${accountCode}.`);
  }

  return account;
}
