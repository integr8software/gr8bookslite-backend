import { ChartAccount, ChartAccountStatus } from '@prisma/client';
import { StandardDefaultAccountMappings } from '../../chart-of-accounts/seed/chart-of-accounts-system-groups.seed';
import { accountGroupHasTag, SystemAccountGroupTags } from '../../chart-of-accounts/utils/system-account-groups.util';

export type TaxMaintenanceAccountField =
  | 'creditableWithholdingTaxAccountId'
  | 'deferredVatAccountId'
  | 'expandedWithholdingTaxAccountId'
  | 'finalWithholdingTaxAccountId'
  | 'inputVatAccountId'
  | 'outputVatAccountId'
  | 'withholdingVatableTaxAccountId';

type TaxMaintenanceAccountRole =
  | 'CREDITABLE_WITHHOLDING_TAX_ACCOUNT'
  | 'DEFERRED_VAT_ACCOUNT'
  | 'EXPANDED_WITHHOLDING_TAX_ACCOUNT'
  | 'FINAL_WITHHOLDING_TAX_ACCOUNT'
  | 'INPUT_TAX_ACCOUNT'
  | 'OUTPUT_VAT_ACCOUNT'
  | 'WITHHOLDING_VATABLE_TAX_ACCOUNT';

const TaxMaintenanceAccountConfig = {
  inputVatAccountId: 'INPUT_TAX_ACCOUNT',
  outputVatAccountId: 'OUTPUT_VAT_ACCOUNT',
  deferredVatAccountId: 'DEFERRED_VAT_ACCOUNT',
  expandedWithholdingTaxAccountId: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
  creditableWithholdingTaxAccountId: 'CREDITABLE_WITHHOLDING_TAX_ACCOUNT',
  withholdingVatableTaxAccountId: 'WITHHOLDING_VATABLE_TAX_ACCOUNT',
  finalWithholdingTaxAccountId: 'FINAL_WITHHOLDING_TAX_ACCOUNT',
} as const satisfies Record<TaxMaintenanceAccountField, TaxMaintenanceAccountRole>;

const TaxMaintenanceAccountFields = Object.keys(TaxMaintenanceAccountConfig) as TaxMaintenanceAccountField[];

const TaxMaintenanceAccountRoleTags = {
  INPUT_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceInputTaxAccount,
  OUTPUT_VAT_ACCOUNT: SystemAccountGroupTags.taxMaintenanceOutputVatAccount,
  DEFERRED_VAT_ACCOUNT: SystemAccountGroupTags.taxMaintenanceDeferredVatAccount,
  EXPANDED_WITHHOLDING_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceExpandedWithholdingTaxAccount,
  CREDITABLE_WITHHOLDING_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceCreditableWithholdingTaxAccount,
  WITHHOLDING_VATABLE_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceWithholdingVatableTaxAccount,
  FINAL_WITHHOLDING_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceFinalWithholdingTaxAccount,
} as const satisfies Record<TaxMaintenanceAccountRole, string>;

export function buildTaxMaintenanceAccountingAccountOptions(accounts: ChartAccount[]) {
  const defaultAccountIds = Object.fromEntries(
    TaxMaintenanceAccountFields.map((field) => {
      const account = findTaxMaintenanceMappedAccount(accounts, TaxMaintenanceAccountConfig[field]);

      return [field, account?.id.toString() ?? ''];
    }),
  ) as Record<TaxMaintenanceAccountField, string>;
  const taxesPayablesGroup = findTaxMaintenanceGroupAccount(accounts);
  const accountOptions = taxesPayablesGroup ? findPostingDescendants(accounts, taxesPayablesGroup.id).map(mapTaxMaintenanceAccountingAccountOption) : [];

  return {
    accountOptions,
    defaultAccountIds,
  };
}

export function getTaxMaintenanceDefaultAccountIds(accounts: ChartAccount[]) {
  return Object.fromEntries(
    TaxMaintenanceAccountFields.map((field) => {
      const account = findTaxMaintenanceMappedAccount(accounts, TaxMaintenanceAccountConfig[field]);

      return [field, account?.id];
    }),
  ) as Record<TaxMaintenanceAccountField, bigint | undefined>;
}

function findTaxMaintenanceMappedAccount(accounts: ChartAccount[], role: TaxMaintenanceAccountRole) {
  const roleTag = TaxMaintenanceAccountRoleTags[role];
  const mappedCode = StandardDefaultAccountMappings.find((mapping) => mapping.moduleCode === 'TXM' && mapping.accountRole === role)?.accountCode;

  return (
    accounts.find((account) => accountGroupHasTag(account.accountGroup, roleTag)) ?? accounts.find((account) => account.accountCode === mappedCode) ?? null
  );
}

function findTaxMaintenanceGroupAccount(accounts: ChartAccount[]) {
  const mappedCode = StandardDefaultAccountMappings.find(
    (mapping) => mapping.moduleCode === 'TXM' && mapping.accountRole === 'TAXES_PAYABLES_GROUP',
  )?.accountCode;

  return (
    accounts.find((account) => accountGroupHasTag(account.accountGroup, SystemAccountGroupTags.taxMaintenanceTaxesPayablesGroup)) ??
    accounts.find((account) => account.accountCode === mappedCode) ??
    null
  );
}

function findPostingDescendants(accounts: ChartAccount[], parentId: bigint) {
  const childrenByParentId = new Map<string, ChartAccount[]>();

  for (const account of accounts) {
    if (!account.parentAccountId) {
      continue;
    }

    const parentKey = account.parentAccountId.toString();
    const siblings = childrenByParentId.get(parentKey) ?? [];

    siblings.push(account);
    childrenByParentId.set(parentKey, siblings);
  }

  const descendants: ChartAccount[] = [];
  const visit = (currentParentId: bigint) => {
    for (const child of childrenByParentId.get(currentParentId.toString()) ?? []) {
      if (child.isPostingAccount) {
        descendants.push(child);
      }

      visit(child.id);
    }
  };

  visit(parentId);

  return descendants;
}

function mapTaxMaintenanceAccountingAccountOption(account: ChartAccount) {
  return {
    id: account.id.toString(),
    accountNumber: account.accountCode,
    accountName: account.accountTitle,
    accountType: mapTaxMaintenanceAccountingAccountType(account),
    statementGroup: account.statementSection ?? '',
    statementSection: account.statementSection ?? '',
    normalBalance: account.accountNature === 'CREDIT' ? 'Credit' : 'Debit',
    accountCategory: account.isPostingAccount ? 'Posting' : 'Header',
    description: account.description ?? account.accountTitle,
    status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
  };
}

function mapTaxMaintenanceAccountingAccountType(account: ChartAccount) {
  switch (account.accountType) {
    case 'ASSET':
      return 'Assets';
    case 'LIABILITY':
      return 'Liabilities';
    case 'EQUITY':
      return 'Equity';
    case 'REVENUE':
      return 'Revenues';
    case 'EXPENSE':
      return 'Expenses';
    default:
      return '';
  }
}
