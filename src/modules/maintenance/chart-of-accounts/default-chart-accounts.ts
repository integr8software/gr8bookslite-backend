import {
  ChartAccountLevel,
  ChartAccountStatus,
  Prisma,
  type DefaultChartAccount,
} from '@prisma/client';
import { StandardDefaultAccountTemplates } from '../../../../prisma/seeds/standardDefaultCoaTemplate';
import { PrismaService } from '../../../prisma/prisma.service';

const RequiredCompanyAccountRoles = [
  {
    moduleCode: 'BM',
    accountRole: 'CASH_IN_BANK_PARENT',
  },
  {
    moduleCode: 'DSM',
    accountRole: 'SALES_DISCOUNT_PARENT',
  },
  {
    moduleCode: 'DSM',
    accountRole: 'PURCHASE_DISCOUNT_PARENT',
  },
] as const;

const CashInBankSpecificPrefix = 'Cash in Bank - ';

export async function seedDefaultChartAccountsForCompany(
  tx: Prisma.TransactionClient | PrismaService,
  companyId: number,
) {
  const defaultAccounts = await tx.defaultChartAccount.findMany({
    orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }],
  });

  if (defaultAccounts.length === 0) {
    throw new Error('Default chart of accounts template has not been seeded.');
  }

  const chartAccountIdByDefaultId = new Map<bigint, bigint>();
  const copiedChartAccountByCode = new Map<
    string,
    { id: bigint; status: ChartAccountStatus }
  >();

  for (const defaultAccount of defaultAccounts) {
    const parentAccountId = defaultAccount.parentDefaultAccountId
      ? chartAccountIdByDefaultId.get(defaultAccount.parentDefaultAccountId)
      : null;

    if (defaultAccount.parentDefaultAccountId && !parentAccountId) {
      throw new Error(
        `Default COA parent was not copied before child ${defaultAccount.accountCode}.`,
      );
    }

    const seededStatus = getSeededChartAccountStatus(defaultAccount);
    const seededDeletedAt =
      seededStatus === ChartAccountStatus.INACTIVE ? new Date() : null;

    const savedAccount = await tx.chartAccount.upsert({
      where: {
        companyId_accountCode: {
          companyId,
          accountCode: defaultAccount.accountCode,
        },
      },
      update: {
        parentAccountId: parentAccountId ?? null,
        accountTitle: defaultAccount.accountTitle,
        accountLevel: defaultAccount.accountLevel,
        accountType: defaultAccount.accountType,
        accountNature: defaultAccount.accountNature,
        accountGroup: defaultAccount.accountGroup,
        statementSection: defaultAccount.statementSection,
        reportAlias: defaultAccount.reportAlias,
        description: defaultAccount.description,
        isPostingAccount: defaultAccount.isPostingAccount,
        withSubsidiary: defaultAccount.withSubsidiary,
        contraAccount: defaultAccount.contraAccount,
        showTotal: defaultAccount.showTotal,
        orderNo: defaultAccount.orderNo,
        status: seededStatus,
        currencyCode: defaultAccount.currencyCode,
        deletedAt: seededDeletedAt,
      },
      create: {
        companyId,
        parentAccountId: parentAccountId ?? null,
        accountCode: defaultAccount.accountCode,
        accountTitle: defaultAccount.accountTitle,
        accountLevel: defaultAccount.accountLevel,
        accountType: defaultAccount.accountType,
        accountNature: defaultAccount.accountNature,
        accountGroup: defaultAccount.accountGroup,
        statementSection: defaultAccount.statementSection,
        reportAlias: defaultAccount.reportAlias,
        description: defaultAccount.description,
        isPostingAccount:
          defaultAccount.accountLevel === ChartAccountLevel.SPECIFIC
            ? defaultAccount.isPostingAccount
            : false,
        withSubsidiary: defaultAccount.withSubsidiary,
        contraAccount: defaultAccount.contraAccount,
        showTotal: defaultAccount.showTotal,
        orderNo: defaultAccount.orderNo,
        status: seededStatus,
        currencyCode: defaultAccount.currencyCode,
        deletedAt: seededDeletedAt,
      },
      select: { id: true },
    });

    chartAccountIdByDefaultId.set(defaultAccount.id, savedAccount.id);
    copiedChartAccountByCode.set(defaultAccount.accountCode, {
      id: savedAccount.id,
      status: seededStatus,
    });
  }

  const mappings = await tx.defaultAccount.findMany({
    include: { defaultChartAccount: true },
  });

  for (const mapping of mappings) {
    if (
      mapping.status === ChartAccountStatus.ACTIVE &&
      (mapping.defaultChartAccount.status !== ChartAccountStatus.ACTIVE ||
        mapping.defaultChartAccount.accountLevel !== mapping.requiredLevel)
    ) {
      throw new Error(
        `Default account mapping ${mapping.moduleCode}:${mapping.accountRole} points to an invalid COA row.`,
      );
    }

    const chartAccountId = chartAccountIdByDefaultId.get(
      mapping.defaultChartAccountId,
    );

    if (!chartAccountId) {
      throw new Error(
        `Default account mapping ${mapping.moduleCode}:${mapping.accountRole} was not copied.`,
      );
    }

    await tx.companyDefaultAccount.upsert({
      where: {
        companyId_moduleCode_accountRole: {
          companyId,
          moduleCode: mapping.moduleCode,
          accountRole: mapping.accountRole,
        },
      },
      update: {
        chartAccountId,
        usageType: mapping.usageType,
        status: mapping.status,
      },
      create: {
        companyId,
        moduleCode: mapping.moduleCode,
        accountRole: mapping.accountRole,
        chartAccountId,
        usageType: mapping.usageType,
        status: mapping.status,
      },
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
    ].filter((account): account is { id: bigint; status: ChartAccountStatus } =>
      Boolean(account),
    );
    const templateStatus = linkedAccounts.every(
      (account) => account.status === ChartAccountStatus.ACTIVE,
    )
      ? ChartAccountStatus.ACTIVE
      : ChartAccountStatus.INACTIVE;
    const templateDeletedAt =
      templateStatus === ChartAccountStatus.INACTIVE ? new Date() : null;

    await tx.defaultAccountTemplate.upsert({
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

  for (const role of RequiredCompanyAccountRoles) {
    const copiedRole = await tx.companyDefaultAccount.findUnique({
      where: {
        companyId_moduleCode_accountRole: {
          companyId,
          moduleCode: role.moduleCode,
          accountRole: role.accountRole,
        },
      },
      select: { id: true },
    });

    if (!copiedRole) {
      throw new Error(
        `Required company account mapping was not copied: ${role.moduleCode}:${role.accountRole}.`,
      );
    }
  }
}

function getCopiedTemplateAccount(
  copiedChartAccountByCode: Map<
    string,
    { id: bigint; status: ChartAccountStatus }
  >,
  accountCode: string,
  templateName: string,
) {
  const account = copiedChartAccountByCode.get(accountCode);

  if (!account) {
    throw new Error(
      `Default account template ${templateName} references an account that was not copied: ${accountCode}.`,
    );
  }

  return account;
}

function getSeededChartAccountStatus(defaultAccount: DefaultChartAccount) {
  if (
    defaultAccount.accountLevel === ChartAccountLevel.SPECIFIC &&
    defaultAccount.accountTitle.startsWith(CashInBankSpecificPrefix)
  ) {
    return ChartAccountStatus.INACTIVE;
  }

  return defaultAccount.status;
}
