export type PartyAccountingAccountField =
  | 'customerAdvanceAccount'
  | 'defaultPayableAccount'
  | 'defaultReceivableAccount'
  | 'employeeAdvanceAccount'
  | 'employeePayableAccount'
  | 'vendorAdvanceAccount';

export type PartyAccountingAccountRole =
  | 'ACCOUNTS_PAYABLE_GROUP'
  | 'ACCOUNTS_RECEIVABLE_GROUP'
  | 'CUSTOMER_ADVANCE_ACCOUNT'
  | 'DEFAULT_PAYABLE_ACCOUNT'
  | 'DEFAULT_RECEIVABLE_ACCOUNT'
  | 'EMPLOYEE_ADVANCE_ACCOUNT'
  | 'EMPLOYEE_PAYABLE_ACCOUNT'
  | 'OTHER_CURRENT_LIABILITIES_GROUP'
  | 'VENDOR_ADVANCE_ACCOUNT';

export type PartyAccountingAccountOption = {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  statementGroup: string;
  statementSection: string;
  normalBalance: 'Credit' | 'Debit';
  accountCategory: string;
  description: string;
  status: 'Active' | 'Inactive';
};

export type PartyAccountingAccountIds = Record<PartyAccountingAccountField, string>;

export type PartyAccountingAccountOptions = Record<PartyAccountingAccountField, PartyAccountingAccountOption[]>;
