import { ChartAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StandardDefaultAccountTemplates } from './default-account-defaults.seed';

type ChartAccountReference = {
  id: bigint;
  status: ChartAccountStatus;
};

export async function seedCompanyDefaultAccountDefaults(
  tx: Prisma.TransactionClient | PrismaService,
  companyId: number,
) {
  const copiedChartAccountByCode = new Map<string, ChartAccountReference>();
  const accountCodes: string[] = [
    ...new Set(
      StandardDefaultAccountTemplates.flatMap((template) => [
        'expenseAccountCode' in template ? template.expenseAccountCode : null,
        'revenueAccountCode' in template ? template.revenueAccountCode : null,
        'assetAccountCode' in template ? template.assetAccountCode : null,
        'accumulatedDepreciationAccountCode' in template
          ? template.accumulatedDepreciationAccountCode
          : null,
      ])
        .filter(Boolean)
        .map(String),
    ),
  ];
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

  for (const template of StandardDefaultAccountTemplates) {
    const expenseAccount =
      'expenseAccountCode' in template
        ? getCopiedTemplateAccount(
            copiedChartAccountByCode,
            template.expenseAccountCode,
            template.name,
          )
        : null;
    const revenueAccount =
      'revenueAccountCode' in template
        ? getCopiedTemplateAccount(
            copiedChartAccountByCode,
            template.revenueAccountCode,
            template.name,
          )
        : null;
    const assetAccount =
      'assetAccountCode' in template
        ? getCopiedTemplateAccount(
            copiedChartAccountByCode,
            template.assetAccountCode,
            template.name,
          )
        : null;
    const accumulatedDepreciationAccount =
      'accumulatedDepreciationAccountCode' in template
        ? getCopiedTemplateAccount(
            copiedChartAccountByCode,
            template.accumulatedDepreciationAccountCode,
            template.name,
          )
        : null;
    const linkedAccounts = [
      expenseAccount,
      revenueAccount,
      assetAccount,
      accumulatedDepreciationAccount,
    ].filter((account): account is ChartAccountReference => Boolean(account));
    const templateStatus = linkedAccounts.every(
      (account) => account.status === ChartAccountStatus.ACTIVE,
    )
      ? ChartAccountStatus.ACTIVE
      : ChartAccountStatus.INACTIVE;
    const templateDeletedAt =
      templateStatus === ChartAccountStatus.INACTIVE ? new Date() : null;

    await tx.defaultAccount.upsert({
      where: {
        companyId_type_name: {
          companyId,
          type: template.type,
          name: template.name,
        },
      },
      update: {
        description: template.name,
        status: templateStatus,
        expenseCoaId: expenseAccount?.id ?? null,
        revenueCoaId: revenueAccount?.id ?? null,
        assetCoaId: assetAccount?.id ?? null,
        accumulatedDepreciationCoaId:
          accumulatedDepreciationAccount?.id ?? null,
        deletedAt: templateDeletedAt,
      },
      create: {
        companyId,
        type: template.type,
        name: template.name,
        description: template.name,
        status: templateStatus,
        expenseCoaId: expenseAccount?.id ?? null,
        revenueCoaId: revenueAccount?.id ?? null,
        assetCoaId: assetAccount?.id ?? null,
        accumulatedDepreciationCoaId:
          accumulatedDepreciationAccount?.id ?? null,
        deletedAt: templateDeletedAt,
      },
    });
  }
}

function getCopiedTemplateAccount(
  copiedChartAccountByCode: Map<string, ChartAccountReference>,
  accountCode: string,
  templateName: string,
) {
  const account = copiedChartAccountByCode.get(accountCode);

  if (!account) {
    throw new Error(
      `Default account ${templateName} references an account that was not copied: ${accountCode}.`,
    );
  }

  return account;
}
