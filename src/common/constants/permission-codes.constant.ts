export const PermissionCodes = {
  ACCOUNTS_PAYABLE_VOUCHER: 'APV',
  PETTY_CASH_ADVANCE: 'PCA',
  PETTY_CASH_ADVANCE_REPLENISHMENT: 'PCAR',
  PETTY_CASH_FUND_REPLENISHMENT: 'PCFR',
  TERM_MANAGEMENT: 'TM',
  BANK_MASTERFILE: 'BM',
  USERS: 'U',
} as const;

export const PlatformModuleCodes = {
  ACCOUNTS_PAYABLE: 'accounts-payable',
  CASH_DISBURSEMENT: 'cash-disbursement',
} as const;
