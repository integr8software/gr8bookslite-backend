import { ChartAccountLevel, DefaultAccountUsageType } from '@prisma/client';

export const StandardDefaultAccountMappings = [
  {
    moduleCode: 'BM',
    accountRole: 'CASH_IN_BANK_PARENT',
    accountCode: '1010102000',
    requiredLevel: ChartAccountLevel.SUB3,
    usageType: DefaultAccountUsageType.PARENT,
    description: 'Parent for Bank Masterfile generated Cash in Bank accounts.',
  },
  {
    moduleCode: 'BM',
    accountRole: 'CASH_ON_HAND_PARENT',
    accountCode: '1010101000',
    requiredLevel: ChartAccountLevel.SUB3,
    usageType: DefaultAccountUsageType.SELECTION_GROUP,
    description: 'Cash on Hand account group reference.',
  },
  {
    moduleCode: 'CD',
    accountRole: 'PETTY_CASH_FUND',
    accountCode: '1010101002',
    requiredLevel: ChartAccountLevel.SPECIFIC,
    usageType: DefaultAccountUsageType.POSTING,
    description: 'Default petty cash fund posting account.',
  },
  {
    moduleCode: 'CD',
    accountRole: 'ACCOUNTS_PAYABLE_PARENT',
    accountCode: '2010001000',
    requiredLevel: ChartAccountLevel.SUB3,
    usageType: DefaultAccountUsageType.SELECTION_GROUP,
    description: 'Accounts payable group for supplier payment debit choices.',
  },
  {
    moduleCode: 'DA',
    accountRole: 'EXPENSE_PARENT',
    accountCode: '6010000000',
    requiredLevel: ChartAccountLevel.SUB1,
    usageType: DefaultAccountUsageType.PARENT,
    description: 'Parent for Default Account generated expense accounts.',
  },
  {
    moduleCode: 'DA',
    accountRole: 'REVENUE_PARENT',
    accountCode: '4020000000',
    requiredLevel: ChartAccountLevel.SUB1,
    usageType: DefaultAccountUsageType.PARENT,
    description:
      'Parent for Default Account generated collection revenue accounts.',
  },
  {
    moduleCode: 'DA',
    accountRole: 'FIXED_ASSET_PARENT',
    accountCode: '1020100000',
    requiredLevel: ChartAccountLevel.SUB2,
    usageType: DefaultAccountUsageType.PARENT,
    description: 'Parent for Default Account generated fixed asset accounts.',
  },
  {
    moduleCode: 'DA',
    accountRole: 'ACCUMULATED_DEPRECIATION_PARENT',
    accountCode: '1020100000',
    requiredLevel: ChartAccountLevel.SUB2,
    usageType: DefaultAccountUsageType.PARENT,
    description:
      'Parent for Default Account generated accumulated depreciation accounts.',
  },
  {
    moduleCode: 'DA',
    accountRole: 'DEPRECIATION_EXPENSE_PARENT',
    accountCode: '6030000000',
    requiredLevel: ChartAccountLevel.SUB1,
    usageType: DefaultAccountUsageType.PARENT,
    description:
      'Parent for Default Account generated depreciation expense accounts.',
  },
  {
    moduleCode: 'DSM',
    accountRole: 'SALES_DISCOUNT_PARENT',
    accountCode: '4010001000',
    requiredLevel: ChartAccountLevel.SUB3,
    usageType: DefaultAccountUsageType.SELECTION_GROUP,
    description:
      'Parent for Discount Management generated sales discount accounts.',
  },
  {
    moduleCode: 'DSM',
    accountRole: 'PURCHASE_DISCOUNT_PARENT',
    accountCode: '5000003000',
    requiredLevel: ChartAccountLevel.SUB3,
    usageType: DefaultAccountUsageType.SELECTION_GROUP,
    description:
      'Parent for Discount Management generated purchase discount accounts.',
  },
] as const;


