import { ItemCategoryAccountingSetupMode } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { ItemCategoryWithAccounts } from '../types/item-category-with-accounts.type';

type ItemCategoryEffectiveAccountingSetup = {
  inventoryAccount: string;
  salesAccount: string;
  costOfSalesAccount: string;
  expenseAccount: string;
};

export function mapItemCategory(
  category: ItemCategoryWithAccounts,
  userNames: Map<number, string>,
  effectiveAccountingSetup: ItemCategoryEffectiveAccountingSetup,
  inheritedAccountingSourceName: string | null,
) {
  return {
    id: category.id.toString(),
    code: category.code,
    name: category.name,
    description: category.description ?? '',
    parentId: category.parentId?.toString() ?? null,
    accountingSetupMode: category.accountingSetupMode,
    accountingSetup:
      category.accountingSetupMode === ItemCategoryAccountingSetupMode.AUTO_CREATE
        ? {
            inventoryAccount: category.inventoryAccount?.accountTitle ?? effectiveAccountingSetup.inventoryAccount,
            salesAccount: category.salesAccount?.accountTitle ?? effectiveAccountingSetup.salesAccount,
            costOfSalesAccount: category.costOfSalesAccount?.accountTitle ?? effectiveAccountingSetup.costOfSalesAccount,
            expenseAccount: category.expenseAccount?.accountTitle ?? effectiveAccountingSetup.expenseAccount,
          }
        : null,
    effectiveAccountingSetup,
    inheritedAccountingSourceName,
    allowSubCategory: category.allowSubCategory,
    status: category.status,
    createdBy: category.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(category.createdByUserId) ?? null),
    createdAt: category.createdAt,
    updatedBy: (category.updatedByUserId && userNames.get(category.updatedByUserId)) ?? null,
    updatedAt: category.updatedAt,
    usedByItemCount: 0,
  };
}
