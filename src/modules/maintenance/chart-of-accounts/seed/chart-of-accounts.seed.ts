import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StandardDefaultChartAccounts } from './chart-of-accounts-defaults.seed';
import { StandardDefaultAccountMappings } from './chart-of-accounts-system-groups.seed';
import { mergeAccountGroupTags, SystemAccountGroupTags } from '../utils/system-account-groups.util';

const CashInBankSpecificPrefix = 'Cash in Bank - ';

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
  StandardDefaultAccountMappings.map((mapping) => [mapping.accountCode, getSystemTagsForMapping(mapping.moduleCode, mapping.accountRole)]),
);

export async function seedCompanyChartAccountDefaults(tx: Prisma.TransactionClient | PrismaService, companyId: number) {
  const chartAccountIdByCode = new Map<string, bigint>();

  for (const defaultAccount of StandardDefaultChartAccounts as readonly StandardDefaultChartAccountSeed[]) {
    const parentAccountId = defaultAccount.parentAccountCode ? chartAccountIdByCode.get(defaultAccount.parentAccountCode) : null;

    if (defaultAccount.parentAccountCode && !parentAccountId) {
      throw new Error(`Default COA parent was not copied before child ${defaultAccount.accountCode}.`);
    }

    const seededStatus = getSeededChartAccountStatus(defaultAccount);
    const seededDeletedAt = seededStatus === ChartAccountStatus.INACTIVE ? new Date() : null;
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
        accountGroup: getSeededAccountGroupTags(defaultAccount),
        statementSection: defaultAccount.statementSection,
        reportAlias: defaultAccount.reportAlias,
        description: defaultAccount.description ?? null,
        isPostingAccount: getSeededIsPostingAccount(defaultAccount),
        withSubsidiary: defaultAccount.withSubsidiary ?? false,
        contraAccount: defaultAccount.contraAccount ?? false,
        showTotal: defaultAccount.showTotal ?? false,
        orderNo: defaultAccount.orderNo,
        status: seededStatus,
        currencyCode: defaultAccount.currencyCode ?? null,
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
        accountGroup: getSeededAccountGroupTags(defaultAccount),
        statementSection: defaultAccount.statementSection,
        reportAlias: defaultAccount.reportAlias,
        description: defaultAccount.description ?? null,
        isPostingAccount: getSeededIsPostingAccount(defaultAccount),
        withSubsidiary: defaultAccount.withSubsidiary ?? false,
        contraAccount: defaultAccount.contraAccount ?? false,
        showTotal: defaultAccount.showTotal ?? false,
        orderNo: defaultAccount.orderNo,
        status: seededStatus,
        currencyCode: defaultAccount.currencyCode ?? null,
        deletedAt: seededDeletedAt,
      },
      select: { id: true },
    });

    chartAccountIdByCode.set(defaultAccount.accountCode, savedAccount.id);
  }

  for (const mapping of StandardDefaultAccountMappings) {
    const copiedAccountId = chartAccountIdByCode.get(mapping.accountCode);

    if (!copiedAccountId) {
      throw new Error(`Required system account was not seeded: ${mapping.moduleCode}:${mapping.accountRole}.`);
    }
  }
}

function getSeededAccountGroupTags(account: StandardDefaultChartAccountSeed) {
  const mappingTags = AccountGroupTagsByAccountCode.get(account.accountCode);

  return mergeAccountGroupTags(account.accountGroup, getStructuralAccountGroupTag(account.accountTitle), mappingTags);
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
