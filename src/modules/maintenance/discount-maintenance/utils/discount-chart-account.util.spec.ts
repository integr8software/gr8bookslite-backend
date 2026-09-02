import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, DiscountType } from '@prisma/client';
import { getGeneratedDiscountAccountTitle, resolveDiscountChartAccount } from './discount-chart-account.util';

describe('discount-chart-account.util', () => {
  function createWriteClient() {
    const chartAccount = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    };

    return { chartAccount };
  }

  it('reuses an existing active account with the same title under the discount parent', async () => {
    const tx = createWriteClient();
    const parent = createParentAccount();
    const existing = { id: 91n, accountTitle: 'Purchase Discount - Loyalty' };
    tx.chartAccount.findMany.mockResolvedValueOnce([parent]);
    tx.chartAccount.findFirst.mockResolvedValue(existing);

    const result = await resolveDiscountChartAccount(tx as never, {
      companyId: 12,
      type: DiscountType.PURCHASES,
      accountTitle: 'Purchase Discount - Loyalty',
      createdByUserId: 7,
    });

    expect(result).toBe(existing);
    expect(tx.chartAccount.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 12,
        parentAccountId: parent.id,
        accountTitle: {
          equals: 'Purchase Discount - Loyalty',
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    });
    expect(tx.chartAccount.create).not.toHaveBeenCalled();
  });

  it('creates a purchase discount contra-expense account with the next available code', async () => {
    const tx = createWriteClient();
    const parent = createParentAccount();
    const created = { id: 92n, accountCode: '5010203002' };
    tx.chartAccount.findMany.mockResolvedValueOnce([parent]).mockResolvedValueOnce([{ accountCode: '5010203001' }, { accountCode: '5010203003' }]);
    tx.chartAccount.findFirst.mockResolvedValue(null);
    tx.chartAccount.create.mockResolvedValue(created);

    const result = await resolveDiscountChartAccount(tx as never, {
      companyId: 12,
      type: DiscountType.PURCHASES,
      accountTitle: 'Purchase Discount - Loyalty',
      createdByUserId: 7,
    });

    expect(result).toBe(created);
    expect(tx.chartAccount.create).toHaveBeenCalledWith({
      data: {
        companyId: 12,
        parentAccountId: parent.id,
        accountCode: '5010203002',
        accountTitle: 'Purchase Discount - Loyalty',
        accountLevel: ChartAccountLevel.SPECIFIC,
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.CREDIT,
        accountGroup: ['Discount Maintenance Purchase Parent', 'Purchasing'],
        statementSection: parent.statementSection,
        reportAlias: 'Purchase Discount - Loyalty',
        description: 'Generated from Discount Maintenance for Purchase Discount - Loyalty.',
        isPostingAccount: true,
        withSubsidiary: false,
        contraAccount: true,
        showTotal: false,
        status: ChartAccountStatus.ACTIVE,
        currencyCode: parent.currencyCode,
        whoCreated: '7',
      },
    });
  });

  it('creates a sales discount as a contra-revenue account and preserves a system-created audit value', async () => {
    const tx = createWriteClient();
    const parent = createParentAccount({
      accountCode: '4010203000',
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.DEBIT,
      accountGroup: ['Discount Maintenance Sales Parent'],
    });
    tx.chartAccount.findMany.mockResolvedValueOnce([parent]).mockResolvedValueOnce([]);
    tx.chartAccount.findFirst.mockResolvedValue(null);
    tx.chartAccount.create.mockResolvedValue({
      accountCode: '4010203001',
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.DEBIT,
      whoCreated: null,
    });

    const result = await resolveDiscountChartAccount(tx as never, {
      companyId: 12,
      type: DiscountType.SALES,
      accountTitle: 'Sales Discount - Seasonal',
      createdByUserId: null,
    });

    expect(result).toEqual(
      expect.objectContaining({
        accountCode: '4010203001',
        accountType: ChartAccountType.REVENUE,
        accountNature: AccountNature.DEBIT,
        whoCreated: null,
      }),
    );
  });

  it.each([
    [DiscountType.PURCHASES, '  Loyalty  ', 'Purchase Discount - Loyalty'],
    [DiscountType.SALES, '  Seasonal  ', 'Sales Discount - Seasonal'],
  ])('generates the account title for %s discounts', (type, name, expected) => {
    expect(getGeneratedDiscountAccountTitle(type, name)).toBe(expected);
  });
});

function createParentAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 40n,
    accountCode: '5010203000',
    accountLevel: ChartAccountLevel.SUB3,
    accountType: ChartAccountType.EXPENSE,
    accountNature: AccountNature.CREDIT,
    accountGroup: ['Discount Maintenance Purchase Parent', 'Purchasing'],
    statementSection: 'PROFIT_OR_LOSS',
    currencyCode: 'PHP',
    status: ChartAccountStatus.ACTIVE,
    deletedAt: null,
    isPostingAccount: false,
    ...overrides,
  };
}
