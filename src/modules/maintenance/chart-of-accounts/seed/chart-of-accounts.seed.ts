import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, DefaultAccountUsageType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StandardDefaultChartAccounts } from './chart-of-accounts-defaults.seed';
import { StandardDefaultAccountMappings } from './chart-of-accounts-system-groups.seed';
import { mergeAccountGroupTags, normalizeAccountGroupTags, SystemAccountGroupTags } from '../utils/system-account-groups.util';

const CashInBankSpecificPrefix = 'Cash in Bank - ';
const ItemCategoryParentAccountTags = [
  SystemAccountGroupTags.itemCategoryInventoryParent,
  SystemAccountGroupTags.itemCategorySalesParent,
  SystemAccountGroupTags.itemCategoryCostOfSalesParent,
  SystemAccountGroupTags.itemCategoryExpenseParent,
] as const;

const ItemCategoryParentAccountCodeCorrections = new Map<
  string,
  {
    accountCode: string;
    parentAccountCode: string;
  }
>([
  ['1010105100', { accountCode: '1010151000', parentAccountCode: '1010100000' }],
  ['4010002000', { accountCode: '4010200000', parentAccountCode: '4010000000' }],
  ['5000001100', { accountCode: '5000011000', parentAccountCode: '5000000000' }],
  ['6000001000', { accountCode: '6040000000', parentAccountCode: '6000000000' }],
]);
const LegacyItemCategoryParentAccountCodes = [...ItemCategoryParentAccountCodeCorrections.keys()];
const TaxModuleCode = 'TXM';

type StandardDefaultChartAccountSeed = {
  parentAccountCode?: string | null;
  accountCode: string;
  accountTitle: string;
  accountLevel: ChartAccountLevel;
  accountType: ChartAccountType;
  accountNature: AccountNature;
  accountGroup?: string | null;
  statementSection?: string | null;
  reportAlias?: string | null;
  description?: string | null;
  isPostingAccount?: boolean;
  withSubsidiary?: boolean;
  contraAccount?: boolean;
  showTotal?: boolean;
  orderNo?: number | null;
  status?: ChartAccountStatus;
  currencyCode?: string | null;
};

const AccountGroupTagsByAccountCode = new Map<string, string[]>(
  StandardDefaultAccountMappings.map((mapping) => [
    getCorrectedSeedAccountCode(mapping.accountCode),
    getSystemTagsForMapping(mapping.moduleCode, mapping.accountRole),
  ]),
);

export async function seedCompanyChartAccountDefaults(tx: Prisma.TransactionClient | PrismaService, companyId: number) {
  const chartAccountIdByCode = new Map<string, bigint>();

  for (const defaultAccount of StandardDefaultChartAccounts as readonly StandardDefaultChartAccountSeed[]) {
    const seededAccount = getCorrectedSeedAccount(defaultAccount);
    const parentAccountId = seededAccount.parentAccountCode ? chartAccountIdByCode.get(seededAccount.parentAccountCode) : null;

    if (seededAccount.parentAccountCode && !parentAccountId) {
      throw new Error(`Default COA parent was not copied before child ${seededAccount.accountCode}.`);
    }

    const seededStatus = getSeededChartAccountStatus(seededAccount);
    const seededDeletedAt = seededStatus === ChartAccountStatus.INACTIVE ? new Date() : null;
    const savedAccount = await tx.chartAccount.upsert({
      where: {
        companyId_accountCode: {
          companyId,
          accountCode: seededAccount.accountCode,
        },
      },
      update: {
        parentAccountId: parentAccountId ?? null,
        accountTitle: seededAccount.accountTitle,
        accountLevel: seededAccount.accountLevel,
        accountType: seededAccount.accountType,
        accountNature: seededAccount.accountNature,
        accountGroup: getSeededAccountGroupTags(seededAccount),
        statementSection: seededAccount.statementSection,
        reportAlias: seededAccount.reportAlias,
        description: seededAccount.description ?? null,
        isPostingAccount: getSeededIsPostingAccount(seededAccount),
        withSubsidiary: seededAccount.withSubsidiary ?? false,
        contraAccount: seededAccount.contraAccount ?? false,
        showTotal: seededAccount.showTotal ?? false,
        orderNo: seededAccount.orderNo,
        status: seededStatus,
        currencyCode: seededAccount.currencyCode ?? null,
        deletedAt: seededDeletedAt,
      },
      create: {
        companyId,
        parentAccountId: parentAccountId ?? null,
        accountCode: seededAccount.accountCode,
        accountTitle: seededAccount.accountTitle,
        accountLevel: seededAccount.accountLevel,
        accountType: seededAccount.accountType,
        accountNature: seededAccount.accountNature,
        accountGroup: getSeededAccountGroupTags(seededAccount),
        statementSection: seededAccount.statementSection,
        reportAlias: seededAccount.reportAlias,
        description: seededAccount.description ?? null,
        isPostingAccount: getSeededIsPostingAccount(seededAccount),
        withSubsidiary: seededAccount.withSubsidiary ?? false,
        contraAccount: seededAccount.contraAccount ?? false,
        showTotal: seededAccount.showTotal ?? false,
        orderNo: seededAccount.orderNo,
        status: seededStatus,
        currencyCode: seededAccount.currencyCode ?? null,
        deletedAt: seededDeletedAt,
      },
      select: { id: true },
    });

    chartAccountIdByCode.set(seededAccount.accountCode, savedAccount.id);
    chartAccountIdByCode.set(defaultAccount.accountCode, savedAccount.id);
  }

  for (const mapping of StandardDefaultAccountMappings) {
    const copiedAccountId = chartAccountIdByCode.get(getCorrectedSeedAccountCode(mapping.accountCode));

    if (!copiedAccountId) {
      throw new Error(`Required system account was not seeded: ${mapping.moduleCode}:${mapping.accountRole}.`);
    }
  }

  await seedCompanyTaxAccountMappings(tx, companyId, chartAccountIdByCode);
  await clearLegacyItemCategoryParentAccountTags(tx, companyId);
}

async function seedCompanyTaxAccountMappings(
  tx: Prisma.TransactionClient | PrismaService,
  companyId: number,
  chartAccountIdByCode: ReadonlyMap<string, bigint>,
) {
  const mappings = StandardDefaultAccountMappings.filter(
    (mapping) => mapping.moduleCode === TaxModuleCode && mapping.usageType === DefaultAccountUsageType.POSTING,
  ).map((mapping) => ({
    companyId,
    moduleCode: TaxModuleCode,
    accountRole: mapping.accountRole,
    chartAccountId: chartAccountIdByCode.get(getCorrectedSeedAccountCode(mapping.accountCode))!,
  }));

  await tx.companyAccountMapping.createMany({
    data: mappings,
    skipDuplicates: true,
  });
}

function getCorrectedSeedAccount(account: StandardDefaultChartAccountSeed): StandardDefaultChartAccountSeed {
  const correction = ItemCategoryParentAccountCodeCorrections.get(account.accountCode);

  if (!correction) {
    return account;
  }

  return {
    ...account,
    accountCode: correction.accountCode,
    parentAccountCode: correction.parentAccountCode,
  };
}

function getCorrectedSeedAccountCode(accountCode: string) {
  return ItemCategoryParentAccountCodeCorrections.get(accountCode)?.accountCode ?? accountCode;
}

function getSeededAccountGroupTags(account: StandardDefaultChartAccountSeed) {
  const mappingTags = AccountGroupTagsByAccountCode.get(account.accountCode);

  return mergeAccountGroupTags(account.accountGroup, getStructuralAccountGroupTag(account.accountTitle), mappingTags);
}

async function clearLegacyItemCategoryParentAccountTags(tx: Prisma.TransactionClient | PrismaService, companyId: number) {
  const legacyAccounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      accountCode: {
        in: LegacyItemCategoryParentAccountCodes,
      },
    },
    select: {
      id: true,
      accountGroup: true,
    },
  });

  await Promise.all(
    legacyAccounts.map((account) => {
      const tags = normalizeAccountGroupTags(account.accountGroup).filter(
        (tag) => !ItemCategoryParentAccountTags.includes(tag as (typeof ItemCategoryParentAccountTags)[number]),
      );

      return tx.chartAccount.update({
        where: {
          id: account.id,
        },
        data: {
          accountGroup: tags.length > 0 ? tags : Prisma.JsonNull,
        },
      });
    }),
  );
}

function getStructuralAccountGroupTag(accountTitle: string) {
  if (/cash in banks?/i.test(accountTitle)) {
    return SystemAccountGroupTags.cashInBank;
  }

  if (/sales discount/i.test(accountTitle)) {
    return SystemAccountGroupTags.salesDiscount;
  }

  if (/purchase discount/i.test(accountTitle)) {
    return SystemAccountGroupTags.purchaseDiscount;
  }

  if (/depreciation expense/i.test(accountTitle)) {
    return SystemAccountGroupTags.depreciationExpense;
  }

  if (/service revenues?/i.test(accountTitle)) {
    return SystemAccountGroupTags.serviceRevenues;
  }

  if (/accumulated depreciation/i.test(accountTitle)) {
    return SystemAccountGroupTags.accumulatedDepreciation;
  }

  if (/fixed assets?|property and equipment/i.test(accountTitle)) {
    return SystemAccountGroupTags.fixedAssets;
  }

  if (/expenses?/i.test(accountTitle)) {
    return SystemAccountGroupTags.expenses;
  }

  if (/revenue|sales/i.test(accountTitle)) {
    return SystemAccountGroupTags.revenue;
  }

  return null;
}

function getSystemTagsForMapping(moduleCode: string, accountRole: string) {
  if (moduleCode === 'BM' && accountRole === 'CASH_IN_BANK_PARENT') {
    return [SystemAccountGroupTags.cashInBank];
  }

  if (moduleCode === 'DA' && accountRole === 'EXPENSE_PARENT') {
    return [SystemAccountGroupTags.expenses, SystemAccountGroupTags.defaultAccountExpenseParent];
  }

  if (moduleCode === 'DA' && accountRole === 'REVENUE_PARENT') {
    return [SystemAccountGroupTags.revenue, SystemAccountGroupTags.defaultAccountRevenueParent];
  }

  if (moduleCode === 'SM' && accountRole === 'SERVICE_REVENUE_PARENT') {
    return [SystemAccountGroupTags.revenue, SystemAccountGroupTags.serviceRevenues, SystemAccountGroupTags.servicesMaintenanceRevenueParent];
  }

  if (moduleCode === 'DA' && accountRole === 'FIXED_ASSET_PARENT') {
    return [SystemAccountGroupTags.fixedAssets, SystemAccountGroupTags.defaultAccountFixedAssetParent];
  }

  if (moduleCode === 'DA' && accountRole === 'ACCUMULATED_DEPRECIATION_PARENT') {
    return [SystemAccountGroupTags.accumulatedDepreciation, SystemAccountGroupTags.defaultAccountAccumulatedDepreciationParent];
  }

  if (moduleCode === 'DA' && accountRole === 'DEPRECIATION_EXPENSE_PARENT') {
    return [SystemAccountGroupTags.depreciationExpense, SystemAccountGroupTags.defaultAccountDepreciationExpenseParent];
  }

  if (moduleCode === 'DSM' && accountRole === 'SALES_DISCOUNT_PARENT') {
    return [SystemAccountGroupTags.salesDiscount, SystemAccountGroupTags.discountManagementSalesParent];
  }

  if (moduleCode === 'DSM' && accountRole === 'PURCHASE_DISCOUNT_PARENT') {
    return [SystemAccountGroupTags.purchaseDiscount, SystemAccountGroupTags.discountManagementPurchaseParent];
  }

  if (moduleCode === 'IC' && accountRole === 'INVENTORY_PARENT') {
    return [SystemAccountGroupTags.itemCategoryInventoryParent];
  }

  if (moduleCode === 'IC' && accountRole === 'SALES_PARENT') {
    return [SystemAccountGroupTags.revenue, SystemAccountGroupTags.itemCategorySalesParent];
  }

  if (moduleCode === 'IC' && accountRole === 'COST_OF_SALES_PARENT') {
    return [SystemAccountGroupTags.itemCategoryCostOfSalesParent];
  }

  if (moduleCode === 'IC' && accountRole === 'EXPENSE_PARENT') {
    return [SystemAccountGroupTags.expenses, SystemAccountGroupTags.itemCategoryExpenseParent];
  }

  if (moduleCode === 'PM' && accountRole === 'ACCOUNTS_RECEIVABLE_GROUP') {
    return [SystemAccountGroupTags.partyAccountsReceivableGroup];
  }

  if (moduleCode === 'PM' && accountRole === 'ACCOUNTS_PAYABLE_GROUP') {
    return [SystemAccountGroupTags.partyAccountsPayableGroup];
  }

  if (moduleCode === 'PM' && accountRole === 'OTHER_CURRENT_LIABILITIES_GROUP') {
    return [SystemAccountGroupTags.partyOtherCurrentLiabilitiesGroup];
  }

  if (moduleCode === 'PM' && accountRole === 'DEFAULT_RECEIVABLE_ACCOUNT') {
    return [SystemAccountGroupTags.partyDefaultReceivableAccount];
  }

  if (moduleCode === 'PM' && accountRole === 'CUSTOMER_ADVANCE_ACCOUNT') {
    return [SystemAccountGroupTags.partyCustomerAdvanceAccount];
  }

  if (moduleCode === 'PM' && accountRole === 'DEFAULT_PAYABLE_ACCOUNT') {
    return [SystemAccountGroupTags.partyDefaultPayableAccount];
  }

  if (moduleCode === 'PM' && accountRole === 'VENDOR_ADVANCE_ACCOUNT') {
    return [SystemAccountGroupTags.partyVendorAdvanceAccount];
  }

  if (moduleCode === 'PM' && accountRole === 'EMPLOYEE_ADVANCE_ACCOUNT') {
    return [SystemAccountGroupTags.partyEmployeeAdvanceAccount];
  }

  if (moduleCode === 'PM' && accountRole === 'EMPLOYEE_PAYABLE_ACCOUNT') {
    return [SystemAccountGroupTags.partyEmployeePayableAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'TAXES_PAYABLES_GROUP') {
    return [SystemAccountGroupTags.taxMaintenanceTaxesPayablesGroup];
  }

  if (moduleCode === 'TXM' && accountRole === 'INPUT_TAX_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceInputTaxAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'OUTPUT_VAT_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceOutputVatAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'DEFERRED_VAT_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceDeferredVatAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'EXPANDED_WITHHOLDING_TAX_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceExpandedWithholdingTaxAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'CREDITABLE_WITHHOLDING_TAX_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceCreditableWithholdingTaxAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'WITHHOLDING_VATABLE_TAX_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceWithholdingVatableTaxAccount];
  }

  if (moduleCode === 'TXM' && accountRole === 'FINAL_WITHHOLDING_TAX_ACCOUNT') {
    return [SystemAccountGroupTags.taxMaintenanceFinalWithholdingTaxAccount];
  }

  return [];
}

function getSeededChartAccountStatus(defaultAccount: StandardDefaultChartAccountSeed) {
  if (defaultAccount.accountLevel === ChartAccountLevel.SPECIFIC && defaultAccount.accountTitle.startsWith(CashInBankSpecificPrefix)) {
    return ChartAccountStatus.INACTIVE;
  }

  return defaultAccount.status ?? ChartAccountStatus.ACTIVE;
}

function getSeededIsPostingAccount(defaultAccount: StandardDefaultChartAccountSeed) {
  return defaultAccount.accountLevel === ChartAccountLevel.SPECIFIC ? (defaultAccount.isPostingAccount ?? true) : false;
}
