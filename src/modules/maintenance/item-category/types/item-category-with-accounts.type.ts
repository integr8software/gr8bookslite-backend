import { Prisma } from '@prisma/client';

export const ItemCategoryWithAccountsInclude = {
  inventoryAccount: true,
  salesAccount: true,
  costOfSalesAccount: true,
  expenseAccount: true,
} satisfies Prisma.ItemCategoryInclude;

export type ItemCategoryWithAccounts = Prisma.ItemCategoryGetPayload<{
  include: typeof ItemCategoryWithAccountsInclude;
}>;
