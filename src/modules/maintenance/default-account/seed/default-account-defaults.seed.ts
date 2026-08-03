import { DefaultAccountTemplateType } from '@prisma/client';

export const StandardDefaultAccountTemplates = [
  {
    type: DefaultAccountTemplateType.COLLECTION,
    name: 'Service Fees',
    revenueAccountCode: '4030000001',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Salaries and Wages',
    expenseAccountCode: '6010000001',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: '13th Month Pay',
    expenseAccountCode: '6010000002',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Bonuses',
    expenseAccountCode: '6010000003',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'SSS/HDMF/PHIC Contributions',
    expenseAccountCode: '6010000004',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: "Employees' Benefits",
    expenseAccountCode: '6010000005',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Employee Relations',
    expenseAccountCode: '6010000006',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Trainings and Seminars',
    expenseAccountCode: '6010000007',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Transportation and Travel',
    expenseAccountCode: '6010000008',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Telephone and Communication',
    expenseAccountCode: '6010000020',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Representation Expense',
    expenseAccountCode: '6010000022',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Rent Expense',
    expenseAccountCode: '6010000021',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Electricity',
    expenseAccountCode: '6010000026',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Water',
    expenseAccountCode: '6010000023',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Fuel and Oil',
    expenseAccountCode: '6010000024',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Repairs and Maintenance',
    expenseAccountCode: '6010000025',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Professional Fees',
    expenseAccountCode: '6010000035',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Insurance Expense',
    expenseAccountCode: '6010000036',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Taxes and Licenses',
    expenseAccountCode: '6010000037',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Depreciation Expense',
    expenseAccountCode: '6010000045',
  },
  {
    type: DefaultAccountTemplateType.EXPENSE,
    name: 'Audit Fees',
    expenseAccountCode: '6010000046',
  },
] as const;
