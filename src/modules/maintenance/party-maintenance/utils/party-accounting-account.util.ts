import { ChartAccount, ChartAccountStatus } from '@prisma/client';
import { StandardDefaultAccountMappings } from '../../chart-of-accounts/seed/chart-of-accounts-system-groups.seed';
import { accountGroupHasTag, SystemAccountGroupTags } from '../../chart-of-accounts/utils/system-account-groups.util';
import type {
  PartyAccountingAccountField,
  PartyAccountingAccountIds,
  PartyAccountingAccountOptions,
  PartyAccountingAccountRole,
} from '../types/party-accounting-account.type';

export const PartyAccountingAccountFields = [
  'defaultReceivableAccount',
  'customerAdvanceAccount',
  'defaultPayableAccount',
  'vendorAdvanceAccount',
  'employeeAdvanceAccount',
  'employeePayableAccount',
] as const satisfies readonly PartyAccountingAccountField[];

export const PartyAccountingAccountConfig = {
  defaultReceivableAccount: {
    defaultRole: 'DEFAULT_RECEIVABLE_ACCOUNT',
    selectionGroupRole: 'ACCOUNTS_RECEIVABLE_GROUP',
  },
  customerAdvanceAccount: {
    defaultRole: 'CUSTOMER_ADVANCE_ACCOUNT',
    selectionGroupRole: 'OTHER_CURRENT_LIABILITIES_GROUP',
  },
  defaultPayableAccount: {
    defaultRole: 'DEFAULT_PAYABLE_ACCOUNT',
    selectionGroupRole: 'ACCOUNTS_PAYABLE_GROUP',
  },
  vendorAdvanceAccount: {
    defaultRole: 'VENDOR_ADVANCE_ACCOUNT',
    selectionGroupRole: 'ACCOUNTS_RECEIVABLE_GROUP',
  },
  employeeAdvanceAccount: {
    defaultRole: 'EMPLOYEE_ADVANCE_ACCOUNT',
    selectionGroupRole: 'ACCOUNTS_RECEIVABLE_GROUP',
  },
  employeePayableAccount: {
    defaultRole: 'EMPLOYEE_PAYABLE_ACCOUNT',
    selectionGroupRole: 'OTHER_CURRENT_LIABILITIES_GROUP',
  },
} as const satisfies Record<
  PartyAccountingAccountField,
  {
    defaultRole: PartyAccountingAccountRole;
    selectionGroupRole: PartyAccountingAccountRole;
  }
>;

const PartyAccountingAccountRoleTags = {
  ACCOUNTS_PAYABLE_GROUP: SystemAccountGroupTags.partyAccountsPayableGroup,
  ACCOUNTS_RECEIVABLE_GROUP: SystemAccountGroupTags.partyAccountsReceivableGroup,
  CUSTOMER_ADVANCE_ACCOUNT: SystemAccountGroupTags.partyCustomerAdvanceAccount,
  DEFAULT_PAYABLE_ACCOUNT: SystemAccountGroupTags.partyDefaultPayableAccount,
  DEFAULT_RECEIVABLE_ACCOUNT: SystemAccountGroupTags.partyDefaultReceivableAccount,
  EMPLOYEE_ADVANCE_ACCOUNT: SystemAccountGroupTags.partyEmployeeAdvanceAccount,
  EMPLOYEE_PAYABLE_ACCOUNT: SystemAccountGroupTags.partyEmployeePayableAccount,
  OTHER_CURRENT_LIABILITIES_GROUP: SystemAccountGroupTags.partyOtherCurrentLiabilitiesGroup,
  VENDOR_ADVANCE_ACCOUNT: SystemAccountGroupTags.partyVendorAdvanceAccount,
} as const satisfies Record<PartyAccountingAccountRole, string>;

export function buildPartyAccountingAccountOptions(accounts: ChartAccount[]): {
  defaultAccounts: PartyAccountingAccountIds;
  accountOptions: PartyAccountingAccountOptions;
} {
  const defaultAccounts = Object.fromEntries(
    PartyAccountingAccountFields.map((field) => {
      const account = findPartyMappedAccount(accounts, PartyAccountingAccountConfig[field].defaultRole);

      return [field, account?.id.toString() ?? ''];
    }),
  ) as PartyAccountingAccountIds;
  const accountOptions = Object.fromEntries(
    PartyAccountingAccountFields.map((field) => {
      const parentAccount = findPartyMappedAccount(accounts, PartyAccountingAccountConfig[field].selectionGroupRole);
      const options = parentAccount ? findPostingDescendants(accounts, parentAccount.id) : [];

      return [field, options.map(mapPartyAccountingAccountOption)];
    }),
  ) as PartyAccountingAccountOptions;

  return {
    defaultAccounts,
    accountOptions,
  };
}

function findPartyMappedAccount(accounts: ChartAccount[], role: PartyAccountingAccountRole) {
  const roleTag = PartyAccountingAccountRoleTags[role];
  const mappedCode = StandardDefaultAccountMappings.find((mapping) => mapping.moduleCode === 'PM' && mapping.accountRole === role)?.accountCode;

  return (
    accounts.find((account) => accountGroupHasTag(account.accountGroup, roleTag)) ?? accounts.find((account) => account.accountCode === mappedCode) ?? null
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

function mapPartyAccountingAccountOption(account: ChartAccount) {
  return {
    id: account.id.toString(),
    accountNumber: account.accountCode,
    accountName: account.accountTitle,
    accountType: mapPartyAccountingAccountType(account),
    statementGroup: account.statementSection ?? '',
    statementSection: account.statementSection ?? '',
    normalBalance: account.accountNature === 'CREDIT' ? 'Credit' : 'Debit',
    accountCategory: account.statementSection ?? '',
    description: account.description ?? account.accountTitle,
    status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
  };
}

function mapPartyAccountingAccountType(account: ChartAccount) {
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
