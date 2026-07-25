import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export const SystemAccountGroupTags = {
  cashInBank: 'Cash in Bank',
  expenses: 'Expenses',
  defaultAccountExpenseParent: 'Default Account Expense Parent',
  revenue: 'Revenue',
  serviceRevenues: 'Service Revenues',
  servicesMaintenanceRevenueParent: 'Services Maintenance Revenue Parent',
  defaultAccountRevenueParent: 'Default Account Revenue Parent',
  fixedAssets: 'Fixed Assets',
  defaultAccountFixedAssetParent: 'Default Account Fixed Asset Parent',
  accumulatedDepreciation: 'Accumulated Depreciation',
  defaultAccountAccumulatedDepreciationParent: 'Default Account Accumulated Depreciation Parent',
  depreciationExpense: 'Depreciation Expense',
  defaultAccountDepreciationExpenseParent: 'Default Account Depreciation Expense Parent',
  salesDiscount: 'Sales Discount',
  discountManagementSalesParent: 'Discount Management Sales Parent',
  purchaseDiscount: 'Purchase Discount',
  discountManagementPurchaseParent: 'Discount Management Purchase Parent',
  itemCategoryInventoryParent: 'Item Category Inventory Parent',
  itemCategorySalesParent: 'Item Category Sales Parent',
  itemCategoryCostOfSalesParent: 'Item Category Cost of Sales Parent',
  itemCategoryExpenseParent: 'Item Category Expense Parent',
  partyAccountsReceivableGroup: 'Party Management Accounts Receivable Group',
  partyAccountsPayableGroup: 'Party Management Accounts Payable Group',
  partyOtherCurrentLiabilitiesGroup: 'Party Management Other Current Liabilities Group',
  partyDefaultReceivableAccount: 'Party Management Default Receivable Account',
  partyCustomerAdvanceAccount: 'Party Management Default Customer Advance Account',
  partyDefaultPayableAccount: 'Party Management Default Payable Account',
  partyVendorAdvanceAccount: 'Party Management Default Vendor Advance Account',
  partyEmployeeAdvanceAccount: 'Party Management Default Employee Advance Account',
  partyEmployeePayableAccount: 'Party Management Default Employee Payable Account',
  taxMaintenanceTaxesPayablesGroup: 'Tax Maintenance Taxes Payables Group',
  taxMaintenanceInputTaxAccount: 'Tax Maintenance Input Tax Account',
  taxMaintenanceOutputVatAccount: 'Tax Maintenance Output VAT Account',
  taxMaintenanceDeferredVatAccount: 'Tax Maintenance Deferred VAT Account',
  taxMaintenanceExpandedWithholdingTaxAccount: 'Tax Maintenance Expanded Withholding Tax Account',
  taxMaintenanceCreditableWithholdingTaxAccount: 'Tax Maintenance Creditable Withholding Tax Account',
  taxMaintenanceWithholdingVatableTaxAccount: 'Tax Maintenance Withholding Vatable Tax Account',
  taxMaintenanceFinalWithholdingTaxAccount: 'Tax Maintenance Final Withholding Tax Account',
} as const;

export const SystemAccountGroups = {
  bankMasterfile: {
    cashInBankParent: {
      accountGroupIncludes: SystemAccountGroupTags.cashInBank,
      requiredLevel: ChartAccountLevel.SUB3,
      accountType: ChartAccountType.ASSET,
      accountNature: AccountNature.DEBIT,
    },
  },
  defaultAccount: {
    expenseParent: {
      accountGroupIncludes: SystemAccountGroupTags.defaultAccountExpenseParent,
      requiredLevel: ChartAccountLevel.SUB1,
      accountType: ChartAccountType.EXPENSE,
      accountNature: AccountNature.DEBIT,
    },
    revenueParent: {
      accountGroupIncludes: SystemAccountGroupTags.defaultAccountRevenueParent,
      requiredLevel: ChartAccountLevel.SUB1,
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.CREDIT,
    },
    fixedAssetParent: {
      accountGroupIncludes: SystemAccountGroupTags.defaultAccountFixedAssetParent,
      requiredLevel: ChartAccountLevel.SUB2,
      accountType: ChartAccountType.ASSET,
      accountNature: AccountNature.DEBIT,
    },
    accumulatedDepreciationParent: {
      accountGroupIncludes: SystemAccountGroupTags.defaultAccountAccumulatedDepreciationParent,
      requiredLevel: ChartAccountLevel.SUB2,
      accountType: ChartAccountType.ASSET,
      accountNature: AccountNature.DEBIT,
    },
    depreciationExpenseParent: {
      accountGroupIncludes: SystemAccountGroupTags.defaultAccountDepreciationExpenseParent,
      requiredLevel: ChartAccountLevel.SUB3,
      accountType: ChartAccountType.EXPENSE,
      accountNature: AccountNature.DEBIT,
    },
  },
  servicesMaintenance: {
    serviceRevenueParent: {
      accountGroupIncludes: SystemAccountGroupTags.servicesMaintenanceRevenueParent,
      requiredLevel: ChartAccountLevel.SUB1,
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.CREDIT,
    },
  },
  discountManagement: {
    salesDiscountParent: {
      accountGroupIncludes: SystemAccountGroupTags.discountManagementSalesParent,
      requiredLevel: ChartAccountLevel.SUB3,
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.DEBIT,
    },
    purchaseDiscountParent: {
      accountGroupIncludes: SystemAccountGroupTags.discountManagementPurchaseParent,
      requiredLevel: ChartAccountLevel.SUB3,
      accountType: ChartAccountType.EXPENSE,
      accountNature: AccountNature.CREDIT,
    },
  },
  itemCategory: {
    inventoryParent: {
      accountGroupIncludes: SystemAccountGroupTags.itemCategoryInventoryParent,
      requiredLevel: ChartAccountLevel.SUB3,
      accountType: ChartAccountType.ASSET,
      accountNature: AccountNature.DEBIT,
    },
    salesParent: {
      accountGroupIncludes: SystemAccountGroupTags.itemCategorySalesParent,
      requiredLevel: ChartAccountLevel.SUB2,
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.CREDIT,
    },
    costOfSalesParent: {
      accountGroupIncludes: SystemAccountGroupTags.itemCategoryCostOfSalesParent,
      requiredLevel: ChartAccountLevel.SUB3,
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.CREDIT,
    },
    expenseParent: {
      accountGroupIncludes: SystemAccountGroupTags.itemCategoryExpenseParent,
      requiredLevel: ChartAccountLevel.SUB1,
      accountType: ChartAccountType.EXPENSE,
      accountNature: AccountNature.DEBIT,
    },
  },
} as const;

type SystemAccountGroupDefinition = {
  accountGroupIncludes: string;
  requiredLevel: ChartAccountLevel;
  accountType: ChartAccountType;
  accountNature: AccountNature;
};

type PrismaClientLike = Prisma.TransactionClient | PrismaService;

export async function findSystemAccountGroupOrThrow(tx: PrismaClientLike, companyId: number, definition: SystemAccountGroupDefinition) {
  const candidates = await tx.chartAccount.findMany({
    where: {
      companyId,
      accountLevel: definition.requiredLevel,
      accountType: definition.accountType,
      accountNature: definition.accountNature,
      status: ChartAccountStatus.ACTIVE,
      deletedAt: null,
      isPostingAccount: false,
    },
    orderBy: [{ accountCode: 'asc' }],
  });
  const account = candidates.find((candidate) => accountGroupHasTag(candidate.accountGroup, definition.accountGroupIncludes));

  if (!account) {
    throw new BadRequestException(`Required system account group was not found: ${definition.accountGroupIncludes}.`);
  }

  return account;
}

export function normalizeAccountGroupTags(value: Prisma.JsonValue | string | string[] | null | undefined) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => (typeof item === 'string' ? [item.trim()] : [])).filter(Boolean))];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

export function toAccountGroupJson(value: Prisma.JsonValue | string | string[] | null | undefined) {
  const tags = normalizeAccountGroupTags(value);
  return tags.length > 0 ? tags : undefined;
}

export function accountGroupHasTag(value: Prisma.JsonValue | string[] | string | null | undefined, tag: string) {
  return normalizeAccountGroupTags(value).some((item) => item.toLowerCase() === tag.trim().toLowerCase());
}

export function mergeAccountGroupTags(...values: Array<Prisma.JsonValue | string | string[] | null | undefined>) {
  const tags = values.flatMap((value) => normalizeAccountGroupTags(value));
  return tags.length > 0 ? [...new Set(tags)] : undefined;
}
