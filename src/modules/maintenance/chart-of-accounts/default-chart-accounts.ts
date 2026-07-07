import {
  ChartAccountLevel,
  ChartAccountStatus,
  Prisma,
  type DefaultChartAccount,
} from '@prisma/client';
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
    where: { status: ChartAccountStatus.ACTIVE },
    orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }],
  });

  if (defaultAccounts.length === 0) {
    throw new Error('Default chart of accounts template has not been seeded.');
  }

  const chartAccountIdByDefaultId = new Map<bigint, bigint>();

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
  }

  const mappings = await tx.defaultAccount.findMany({
    where: { status: ChartAccountStatus.ACTIVE },
    include: { defaultChartAccount: true },
  });

  for (const mapping of mappings) {
    if (
      mapping.defaultChartAccount.status !== ChartAccountStatus.ACTIVE ||
      mapping.defaultChartAccount.accountLevel !== mapping.requiredLevel
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

function getSeededChartAccountStatus(defaultAccount: DefaultChartAccount) {
  if (
    defaultAccount.accountLevel === ChartAccountLevel.SPECIFIC &&
    defaultAccount.accountTitle.startsWith(CashInBankSpecificPrefix)
  ) {
    return ChartAccountStatus.INACTIVE;
  }

  return defaultAccount.status;
}
