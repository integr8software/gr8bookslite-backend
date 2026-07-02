import { ChartAccountStatus } from '@prisma/client';
import { prisma } from './prismaClient';
import {
  ActiveDefaultCoaStatus,
  StandardDefaultAccountMappings,
  StandardDefaultChartAccounts,
} from './standardDefaultCoaTemplate';

export async function seedDefaultCoaTemplate() {
  const accountIdByCode = new Map<string, bigint>();
  const activeAccountCodes = StandardDefaultChartAccounts.map(
    (account) => account.accountCode,
  );

  await prisma.defaultChartAccount.updateMany({
    where: {
      accountCode: { notIn: activeAccountCodes },
      status: ChartAccountStatus.ACTIVE,
    },
    data: { status: ChartAccountStatus.INACTIVE },
  });

  for (const account of StandardDefaultChartAccounts) {
    const isPostingAccount = getIsPostingAccount(account);
    const savedAccount = await prisma.defaultChartAccount.upsert({
      where: { accountCode: account.accountCode },
      update: {
        accountTitle: account.accountTitle,
        accountLevel: account.accountLevel,
        accountType: account.accountType,
        accountNature: account.accountNature,
        accountGroup: account.accountGroup,
        reportAlias: account.reportAlias,
        class: getAccountDescription(account),
        isPostingAccount,
        orderNo: account.orderNo,
        status: ActiveDefaultCoaStatus,
      },
      create: {
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
        accountLevel: account.accountLevel,
        accountType: account.accountType,
        accountNature: account.accountNature,
        accountGroup: account.accountGroup,
        reportAlias: account.reportAlias,
        class: getAccountDescription(account),
        isPostingAccount,
        orderNo: account.orderNo,
        status: ActiveDefaultCoaStatus,
      },
      select: { id: true },
    });

    accountIdByCode.set(account.accountCode, savedAccount.id);
  }

  for (const account of StandardDefaultChartAccounts) {
    const accountId = accountIdByCode.get(account.accountCode);
    const parentAccountId =
      'parentAccountCode' in account && account.parentAccountCode
        ? accountIdByCode.get(account.parentAccountCode)
        : null;

    if (!accountId) {
      throw new Error(
        `Default COA account was not seeded: ${account.accountCode}`,
      );
    }

    await prisma.defaultChartAccount.update({
      where: { id: accountId },
      data: { parentDefaultAccountId: parentAccountId ?? null },
    });
  }

  for (const mapping of StandardDefaultAccountMappings) {
    const defaultChartAccountId = accountIdByCode.get(mapping.accountCode);

    if (!defaultChartAccountId) {
      throw new Error(
        `Default account mapping target was not seeded: ${mapping.accountCode}`,
      );
    }

    await prisma.defaultAccount.upsert({
      where: {
        moduleCode_accountRole: {
          moduleCode: mapping.moduleCode,
          accountRole: mapping.accountRole,
        },
      },
      update: {
        defaultChartAccountId,
        requiredLevel: mapping.requiredLevel,
        usageType: mapping.usageType,
        description: mapping.description,
        status: ChartAccountStatus.ACTIVE,
      },
      create: {
        moduleCode: mapping.moduleCode,
        accountRole: mapping.accountRole,
        defaultChartAccountId,
        requiredLevel: mapping.requiredLevel,
        usageType: mapping.usageType,
        description: mapping.description,
        status: ChartAccountStatus.ACTIVE,
      },
    });
  }
}

function getIsPostingAccount(
  account: (typeof StandardDefaultChartAccounts)[number],
) {
  return 'isPostingAccount' in account ? account.isPostingAccount : false;
}

function getAccountDescription(
  account: (typeof StandardDefaultChartAccounts)[number],
) {
  if (account.accountLevel !== 'SPECIFIC') {
    return `Parent account group for ${account.accountTitle}.`.slice(0, 50);
  }

  return account.accountTitle.slice(0, 50);
}
