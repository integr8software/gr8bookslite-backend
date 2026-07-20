import { ChartAccount, ChartAccountLevel, ChartAccountStatus, Prisma } from '@prisma/client';
import { generateNextAccountCodeFromSiblings } from '../../chart-of-accounts/utils/chart-account-code.util';
import { findSystemAccountGroupOrThrow, SystemAccountGroups } from '../../chart-of-accounts/utils/system-account-groups.util';

type PrismaClientLike = Prisma.TransactionClient;

type ItemCategoryAccountRole = 'inventory' | 'sales' | 'costOfSales' | 'expense';

type ResolvedItemCategoryAccountingAccounts = {
  inventoryAccountId: bigint;
  salesAccountId: bigint;
  costOfSalesAccountId: bigint;
  expenseAccountId: bigint;
};

const ItemCategoryAccountDefinitions: Record<
  ItemCategoryAccountRole,
  {
    parent: (typeof SystemAccountGroups.itemCategory)[keyof typeof SystemAccountGroups.itemCategory];
    titlePrefix: string;
  }
> = {
  inventory: {
    parent: SystemAccountGroups.itemCategory.inventoryParent,
    titlePrefix: 'Inventory',
  },
  sales: {
    parent: SystemAccountGroups.itemCategory.salesParent,
    titlePrefix: 'Sales',
  },
  costOfSales: {
    parent: SystemAccountGroups.itemCategory.costOfSalesParent,
    titlePrefix: 'Cost of Sales',
  },
  expense: {
    parent: SystemAccountGroups.itemCategory.expenseParent,
    titlePrefix: 'Expense',
  },
};

export async function resolveItemCategoryAccountingAccounts(
  tx: PrismaClientLike,
  companyId: number,
  categoryName: string,
): Promise<ResolvedItemCategoryAccountingAccounts> {
  const [inventoryAccountId, salesAccountId, costOfSalesAccountId, expenseAccountId] = await Promise.all([
    resolvePostingAccount(tx, companyId, categoryName, ItemCategoryAccountDefinitions.inventory),
    resolvePostingAccount(tx, companyId, categoryName, ItemCategoryAccountDefinitions.sales),
    resolvePostingAccount(tx, companyId, categoryName, ItemCategoryAccountDefinitions.costOfSales),
    resolvePostingAccount(tx, companyId, categoryName, ItemCategoryAccountDefinitions.expense),
  ]);

  return {
    inventoryAccountId,
    salesAccountId,
    costOfSalesAccountId,
    expenseAccountId,
  };
}

function getItemCategoryAccountTitle(prefix: string, categoryName: string) {
  return `${prefix} - ${categoryName.trim()}`;
}

async function resolvePostingAccount(
  tx: PrismaClientLike,
  companyId: number,
  categoryName: string,
  definition: {
    parent: (typeof SystemAccountGroups.itemCategory)[keyof typeof SystemAccountGroups.itemCategory];
    titlePrefix: string;
  },
) {
  const parentAccount = await findSystemAccountGroupOrThrow(tx, companyId, definition.parent);
  const accountTitle = getItemCategoryAccountTitle(definition.titlePrefix, categoryName);
  const generatedDescription = getItemCategoryAccountDescription(categoryName);
  const existingAccount = await tx.chartAccount.findFirst({
    where: {
      companyId,
      parentAccountId: parentAccount.id,
      accountTitle: {
        equals: accountTitle,
        mode: 'insensitive',
      },
      deletedAt: null,
    },
    select: {
      id: true,
      description: true,
    },
  });

  if (existingAccount) {
    if (existingAccount.description === generatedDescription) {
      await tx.chartAccount.update({
        where: {
          id: existingAccount.id,
        },
        data: {
          description: null,
        },
      });
    }

    return existingAccount.id;
  }

  const accountCode = await generateNextPostingAccountCode(tx, companyId, parentAccount);
  const account = await tx.chartAccount.create({
    data: {
      companyId,
      parentAccountId: parentAccount.id,
      accountCode,
      accountTitle,
      accountLevel: ChartAccountLevel.SPECIFIC,
      accountType: parentAccount.accountType,
      accountNature: parentAccount.accountNature,
      accountGroup: parentAccount.accountGroup ?? undefined,
      statementSection: parentAccount.statementSection,
      reportAlias: parentAccount.reportAlias,
      description: null,
      isPostingAccount: true,
      withSubsidiary: false,
      contraAccount: false,
      showTotal: false,
      orderNo: parentAccount.orderNo,
      status: ChartAccountStatus.ACTIVE,
    },
    select: {
      id: true,
    },
  });

  return account.id;
}

function getItemCategoryAccountDescription(categoryName: string) {
  return `Auto-created item category account for ${categoryName.trim()}.`;
}

async function generateNextPostingAccountCode(tx: PrismaClientLike, companyId: number, parentAccount: Pick<ChartAccount, 'id' | 'accountCode'>) {
  const siblings = await tx.chartAccount.findMany({
    where: {
      companyId,
      parentAccountId: parentAccount.id,
    },
    select: {
      accountCode: true,
    },
  });

  return generateNextAccountCodeFromSiblings({
    parentCode: parentAccount.accountCode,
    accountLevel: ChartAccountLevel.SPECIFIC,
    siblingCodes: siblings.map((sibling) => sibling.accountCode),
  });
}
