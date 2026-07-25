import { ChartAccount, ChartAccountStatus } from '@prisma/client';
import { StandardDefaultAccountMappings } from '../../maintenance/chart-of-accounts/seed/chart-of-accounts-system-groups.seed';
import { accountGroupHasTag, SystemAccountGroupTags } from '../../maintenance/chart-of-accounts/utils/system-account-groups.util';
import { TaxModuleCode } from '../constants/tax.constants';

export type TaxAccountField =
  | 'creditableWithholdingTaxAccountId'
  | 'deferredTaxAccountId'
  | 'expandedWithholdingTaxAccountId'
  | 'finalWithholdingTaxAccountId'
  | 'inputTaxAccountId'
  | 'outputTaxAccountId'
  | 'withholdingVatableTaxAccountId';

export type TaxAccountRole =
  | 'CREDITABLE_WITHHOLDING_TAX_ACCOUNT'
  | 'DEFERRED_VAT_ACCOUNT'
  | 'EXPANDED_WITHHOLDING_TAX_ACCOUNT'
  | 'FINAL_WITHHOLDING_TAX_ACCOUNT'
  | 'INPUT_TAX_ACCOUNT'
  | 'OUTPUT_VAT_ACCOUNT'
  | 'WITHHOLDING_VATABLE_TAX_ACCOUNT';

export const TaxDefaultAccountDefinitions = [
  { field: 'inputTaxAccountId', role: 'INPUT_TAX_ACCOUNT', label: 'Input VAT' },
  { field: 'outputTaxAccountId', role: 'OUTPUT_VAT_ACCOUNT', label: 'Output VAT' },
  { field: 'deferredTaxAccountId', role: 'DEFERRED_VAT_ACCOUNT', label: 'Deferred Output VAT' },
  { field: 'expandedWithholdingTaxAccountId', role: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT', label: 'Expanded Withholding Tax' },
  { field: 'creditableWithholdingTaxAccountId', role: 'CREDITABLE_WITHHOLDING_TAX_ACCOUNT', label: 'Creditable Withholding Tax' },
  { field: 'withholdingVatableTaxAccountId', role: 'WITHHOLDING_VATABLE_TAX_ACCOUNT', label: 'Withholding VAT' },
  { field: 'finalWithholdingTaxAccountId', role: 'FINAL_WITHHOLDING_TAX_ACCOUNT', label: 'Final Withholding Tax' },
] as const satisfies ReadonlyArray<{ field: TaxAccountField; role: TaxAccountRole; label: string }>;

const TaxAccountRoleTags = {
  INPUT_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceInputTaxAccount,
  OUTPUT_VAT_ACCOUNT: SystemAccountGroupTags.taxMaintenanceOutputVatAccount,
  DEFERRED_VAT_ACCOUNT: SystemAccountGroupTags.taxMaintenanceDeferredVatAccount,
  EXPANDED_WITHHOLDING_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceExpandedWithholdingTaxAccount,
  CREDITABLE_WITHHOLDING_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceCreditableWithholdingTaxAccount,
  WITHHOLDING_VATABLE_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceWithholdingVatableTaxAccount,
  FINAL_WITHHOLDING_TAX_ACCOUNT: SystemAccountGroupTags.taxMaintenanceFinalWithholdingTaxAccount,
} as const satisfies Record<TaxAccountRole, string>;

export function buildTaxAccountingAccountOptions(accounts: ChartAccount[], configuredAccountIds: Partial<Record<TaxAccountRole, string>> = {}) {
  const defaultAccountIds = Object.fromEntries(
    TaxDefaultAccountDefinitions.map(({ field, role }) => {
      const configuredAccount = accounts.find((account) => account.id.toString() === configuredAccountIds[role]);
      const account = configuredAccount ?? findTaxMappedAccount(accounts, role);
      return [field, account?.id.toString() ?? ''];
    }),
  ) as Record<TaxAccountField, string>;

  return {
    accountOptions: accounts.filter((account) => account.isPostingAccount).map(mapTaxAccountingAccountOption),
    defaultAccountIds,
  };
}

function findTaxMappedAccount(accounts: ChartAccount[], role: TaxAccountRole) {
  const roleTag = TaxAccountRoleTags[role];
  const mappedCode = StandardDefaultAccountMappings.find((mapping) => mapping.moduleCode === TaxModuleCode && mapping.accountRole === role)?.accountCode;

  return (
    accounts.find((account) => accountGroupHasTag(account.accountGroup, roleTag)) ?? accounts.find((account) => account.accountCode === mappedCode) ?? null
  );
}

function mapTaxAccountingAccountOption(account: ChartAccount) {
  return {
    id: account.id.toString(),
    accountNumber: account.accountCode,
    accountName: account.accountTitle,
    accountType: mapTaxAccountingAccountType(account),
    statementGroup: account.statementSection ?? '',
    statementSection: account.statementSection ?? '',
    normalBalance: account.accountNature === 'CREDIT' ? 'Credit' : 'Debit',
    accountCategory: 'Posting',
    description: account.description ?? account.accountTitle,
    status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
  };
}

function mapTaxAccountingAccountType(account: ChartAccount) {
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
