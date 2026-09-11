/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType, ServiceAccountSetupMode } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { CollectionTypeService } from './collection-type.service';

const user = { id: 7, companyId: 11, role: AppRole.SUPER_ADMIN } as never;
const context = {
  moduleCode: 'CTM',
  type: DefaultAccountTemplateType.COLLECTION,
  label: 'collection types',
};

describe('CollectionTypeService options', () => {
  it('returns collection options with backend-owned revenue account details', async () => {
    const prisma = {
      defaultAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9n,
            type: DefaultAccountTemplateType.COLLECTION,
            name: 'Tuition',
            description: 'School fees',
            status: ChartAccountStatus.ACTIVE,
            revenueCoa: {
              id: 101n,
              accountCode: '4100-001',
              accountTitle: 'Tuition Revenue',
              accountType: ChartAccountType.REVENUE,
              accountNature: AccountNature.CREDIT,
            },
          },
        ]),
      },
    };
    const service = new CollectionTypeService(prisma as never);

    const result = await service.findCollectionOptions(user, { search: ' tuition ' });

    expect(prisma.defaultAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          type: DefaultAccountTemplateType.COLLECTION,
          status: ChartAccountStatus.ACTIVE,
          OR: expect.arrayContaining([{ name: { contains: 'tuition', mode: 'insensitive' } }]),
        }),
      }),
    );
    expect(result.options).toEqual([
      {
        id: '9',
        type: DefaultAccountTemplateType.COLLECTION,
        defaultAccountName: 'Tuition',
        description: 'School fees',
        status: ChartAccountStatus.ACTIVE,
        chartAccountId: '101',
        accountCode: '4100-001',
        accountTitle: 'Tuition Revenue',
        accountType: ChartAccountType.REVENUE,
        accountNature: AccountNature.CREDIT,
      },
    ]);
  });
});

describe('CollectionTypeService account setup', () => {
  it('rejects existing account setup without an account', async () => {
    const prisma = createPrismaMock();
    const service = new CollectionTypeService(prisma as never);

    await expect(
      service.create(
        user,
        {
          type: DefaultAccountTemplateType.COLLECTION,
          defaultAccountName: 'Tuition',
          accountSetupMode: ServiceAccountSetupMode.EXISTING,
        },
        context,
      ),
    ).rejects.toThrow('Account is required when selecting an existing account.');
    expect(prisma.defaultAccount.findFirst).not.toHaveBeenCalled();
  });

  it('creates a collection type with a selected existing revenue account', async () => {
    const prisma = createPrismaMock();
    const selectedRevenueAccount = {
      id: 101n,
      accountGroup: ['Default Account Revenue Parent'],
    };
    const savedTemplate = createCollectionTypeTemplate({
      accountSetupMode: ServiceAccountSetupMode.EXISTING,
      revenueCoaId: selectedRevenueAccount.id,
      revenueCoa: {
        id: selectedRevenueAccount.id,
        accountCode: '4100-001',
        accountTitle: 'Tuition Revenue',
        accountType: ChartAccountType.REVENUE,
        accountNature: AccountNature.CREDIT,
        parentAccountId: 88n,
        status: ChartAccountStatus.ACTIVE,
      },
    });
    const tx = createTransactionMock({
      chartAccount: {
        findFirst: jest.fn().mockResolvedValue(selectedRevenueAccount),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      defaultAccount: {
        create: jest.fn().mockResolvedValue(savedTemplate),
      },
    });
    prisma.defaultAccount.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => Promise.resolve(callback(tx)));

    const result = await new CollectionTypeService(prisma as never).create(
      user,
      {
        type: DefaultAccountTemplateType.COLLECTION,
        defaultAccountName: 'Tuition',
        description: 'School fees',
        status: ChartAccountStatus.ACTIVE,
        accountSetupMode: ServiceAccountSetupMode.EXISTING,
        revenueCoaId: '101',
      },
      context,
    );

    expect(tx.chartAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 101n,
          companyId: 11,
          status: ChartAccountStatus.ACTIVE,
          deletedAt: null,
          isPostingAccount: true,
        }),
      }),
    );
    expect(tx.chartAccount.create).not.toHaveBeenCalled();
    expect(tx.defaultAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountSetupMode: ServiceAccountSetupMode.EXISTING,
          revenueCoaId: 101n,
        }),
      }),
    );
    expect(result.defaultAccount.accountSetupMode).toBe(ServiceAccountSetupMode.EXISTING);
    expect(result.defaultAccount.revenueCoaId).toBe('101');
  });

  it('creates a generated revenue account for automatic setup', async () => {
    const prisma = createPrismaMock();
    const parentAccount = {
      id: 88n,
      accountCode: '4010100000',
      accountGroup: ['Default Account Revenue Parent'],
    };
    const generatedAccount = {
      id: 102n,
      accountCode: '4010100001',
      accountTitle: 'Tuition',
      accountType: ChartAccountType.REVENUE,
      accountNature: AccountNature.CREDIT,
      parentAccountId: parentAccount.id,
      status: ChartAccountStatus.ACTIVE,
    };
    const savedTemplate = createCollectionTypeTemplate({
      accountSetupMode: ServiceAccountSetupMode.AUTO,
      revenueCoaId: generatedAccount.id,
      revenueCoa: generatedAccount,
    });
    const tx = createTransactionMock({
      chartAccount: {
        findMany: jest.fn().mockResolvedValueOnce([parentAccount]).mockResolvedValueOnce([]),
        create: jest.fn().mockResolvedValue(generatedAccount),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      defaultAccount: {
        create: jest.fn().mockResolvedValue(savedTemplate),
      },
    });
    prisma.defaultAccount.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => Promise.resolve(callback(tx)));

    await new CollectionTypeService(prisma as never).create(
      user,
      {
        type: DefaultAccountTemplateType.COLLECTION,
        defaultAccountName: 'Tuition',
        accountSetupMode: ServiceAccountSetupMode.AUTO,
      },
      context,
    );

    expect(tx.chartAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentAccountId: parentAccount.id,
          accountCode: '4010100001',
          accountTitle: 'Tuition',
          accountType: ChartAccountType.REVENUE,
          accountNature: AccountNature.CREDIT,
        }),
      }),
    );
    expect(tx.defaultAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountSetupMode: ServiceAccountSetupMode.AUTO,
          revenueCoaId: generatedAccount.id,
        }),
      }),
    );
  });
});

function createPrismaMock() {
  return {
    defaultAccount: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 7, name: 'Ada User' }]),
    },
    $transaction: jest.fn(),
  };
}

function createTransactionMock(overrides: { chartAccount: Record<string, jest.Mock>; defaultAccount: Record<string, jest.Mock> }) {
  return {
    chartAccount: overrides.chartAccount,
    defaultAccount: overrides.defaultAccount,
  };
}

function createCollectionTypeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 9n,
    companyId: 11,
    type: DefaultAccountTemplateType.COLLECTION,
    name: 'Tuition',
    description: 'School fees',
    status: ChartAccountStatus.ACTIVE,
    accountSetupMode: ServiceAccountSetupMode.AUTO,
    expenseCoaId: null,
    revenueCoaId: 102n,
    assetCoaId: null,
    accumulatedDepreciationCoaId: null,
    expenseCoa: null,
    revenueCoa: null,
    assetCoa: null,
    accumulatedDepreciationCoa: null,
    createdByUserId: 7,
    updatedByUserId: null,
    createdAt: new Date('2026-09-10T00:00:00Z'),
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
