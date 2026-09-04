/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import {
  AccountNature,
  ChartAccountStatus,
  ChartAccountType,
  MembershipStatus,
  Prisma,
  TaxAmountSource,
  TaxEntrySide,
  TaxPostingEvent,
  TaxStatus,
  TaxTransactionScope,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppRole } from '../../common/enums/app-role.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { TaxService } from './tax.service';

describe('TaxService', () => {
  function createService() {
    const prisma = {
      tax: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      companyAccountMapping: {
        findMany: jest.fn(),
      },
      membership: {
        findUnique: jest.fn(),
      },
    };

    return { prisma, service: new TaxService(prisma as never) };
  }

  function createTax(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 1,
      sourceKey: 'PH-TAX-0092',
      transactionType: 'Purchases',
      taxType: 'EWT',
      taxCode: 'WC 160',
      taxDescription: 'WC 160 | Income Payment Made by Top Withholding Agents to Their Local/Resident Supplier of Services',
      taxRate: new Prisma.Decimal('2'),
      taxExempt: false,
      taxAlias: null,
      atc: 'WC 160',
      officialAtcCode: 'WC 160',
      natureOfIncome: 'Income Payment Made by Top Withholding Agents to Their Local/Resident Supplier of Services',
      sortOrder: 10,
      status: TaxStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      ...overrides,
    };
  }

  function createPostingRule(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 10,
      taxId: 1,
      transactionScope: TaxTransactionScope.PURCHASE,
      postingEvent: TaxPostingEvent.RECOGNITION,
      accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
      entrySide: TaxEntrySide.CREDIT,
      amountSource: TaxAmountSource.TAX_AMOUNT,
      priority: 100,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      ...overrides,
    };
  }

  function createCompanyAccountMapping(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 15n,
      companyId: 11,
      moduleCode: 'TXM',
      accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
      chartAccountId: 201n,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      chartAccount: {
        id: 201n,
        companyId: 11,
        accountCode: '2010002002',
        accountTitle: 'Expanded Withholding Tax',
        accountType: ChartAccountType.LIABILITY,
        accountNature: AccountNature.CREDIT,
        accountLevel: 'SPECIFIC',
        accountGroup: null,
        statementSection: 'Balance Sheet',
        reportAlias: null,
        description: null,
        isPostingAccount: true,
        withSubsidiary: false,
        contraAccount: false,
        showTotal: false,
        orderNo: 91,
        status: ChartAccountStatus.ACTIVE,
        currencyCode: null,
        parentAccountId: null,
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: null,
      },
      ...overrides,
    };
  }

  const superAdminUser = {
    id: 1,
    companyId: 11,
    role: AppRole.SUPER_ADMIN,
  } as AuthUser;

  it('lists active taxes with normalized query, pagination, and default ordering', async () => {
    const { prisma, service } = createService();
    prisma.tax.findMany.mockResolvedValue([
      createTax({
        taxType: 'INPUT VAT',
        taxCode: 'V3',
        taxDescription: 'Services',
        taxRate: new Prisma.Decimal('12'),
      }),
    ]);

    await expect(service.listTaxes({ query: ' vat ', transactionType: 'Purchases', taxType: 'INPUT VAT', limit: 50 })).resolves.toEqual({
      taxCodes: [
        expect.objectContaining({
          sourceKey: 'PH-TAX-0092',
          transactionType: 'Purchases',
          taxType: 'INPUT VAT',
          taxCode: 'V3',
          taxRate: '12',
        }),
      ],
      taxes: [
        expect.objectContaining({
          sourceKey: 'PH-TAX-0092',
          taxCode: 'V3',
        }),
      ],
    });
    expect(prisma.tax.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionType: 'Purchases',
          taxType: 'INPUT VAT',
          status: 'ACTIVE',
          OR: expect.arrayContaining([
            {
              taxDescription: {
                contains: 'vat',
                mode: 'insensitive',
              },
            },
          ]),
        }),
        skip: 0,
        take: 50,
      }),
    );
  });

  it('returns tax rows with resolved company default account titles', async () => {
    const { prisma, service } = createService();
    prisma.tax.findMany.mockResolvedValue([
      {
        ...createTax(),
        postingRules: [createPostingRule()],
      },
    ]);
    prisma.companyAccountMapping.findMany.mockResolvedValue([createCompanyAccountMapping()]);

    const result = await service.listTaxesWithDefaultAccounts(superAdminUser, { taxType: 'EWT', limit: 1000 });

    expect(prisma.companyAccountMapping.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          moduleCode: 'TXM',
          accountRole: {
            in: ['EXPANDED_WITHHOLDING_TAX_ACCOUNT'],
          },
        },
      }),
    );
    expect(result).toEqual({
      companyId: 11,
      taxCodes: [
        expect.objectContaining({
          sourceKey: 'PH-TAX-0092',
          defaultTaxAccounts: [
            expect.objectContaining({
              accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
              chartAccount: expect.objectContaining({
                accountCode: '2010002002',
                accountTitle: 'Expanded Withholding Tax',
              }),
            }),
          ],
          postingAccounts: [
            expect.objectContaining({
              accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
              chartAccount: expect.objectContaining({
                accountTitle: 'Expanded Withholding Tax',
              }),
            }),
          ],
        }),
      ],
      taxes: [
        expect.objectContaining({
          sourceKey: 'PH-TAX-0092',
        }),
      ],
    });
  });

  it('returns dedicated default-account option groups filtered by classification', async () => {
    const { prisma, service } = createService();
    prisma.tax.findMany.mockResolvedValue([
      {
        ...createTax(),
        postingRules: [createPostingRule()],
      },
      {
        ...createTax({
          id: 2,
          sourceKey: 'PH-TAX-0012',
          transactionType: 'Sales',
          taxType: 'OUTPUT VAT',
          taxCode: 'V1',
          taxDescription: 'Output VAT',
          taxRate: new Prisma.Decimal('12'),
          officialAtcCode: null,
          natureOfIncome: null,
        }),
        postingRules: [
          createPostingRule({
            id: 11,
            taxId: 2,
            transactionScope: TaxTransactionScope.SALE,
            accountRole: 'OUTPUT_VAT_ACCOUNT',
            entrySide: TaxEntrySide.CREDIT,
          }),
        ],
      },
    ]);
    prisma.companyAccountMapping.findMany.mockResolvedValue([createCompanyAccountMapping()]);

    const result = await service.listTaxDefaultAccountOptions(superAdminUser, 'purchase-ewt');

    expect(prisma.tax.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ACTIVE',
          OR: [
            {
              transactionType: 'Purchases',
              taxType: {
                in: ['EWT'],
              },
              officialAtcCode: undefined,
            },
          ],
        },
      }),
    );
    expect(result.groups).toEqual([
      {
        classification: 'purchase-ewt',
        label: 'Purchase Expanded Withholding Tax',
        options: [
          {
            sourceKey: 'PH-TAX-0092',
            transactionType: 'Purchases',
            taxType: 'EWT',
            taxCode: 'WC 160',
            displayCode: 'WC 160',
            taxDescription: 'WC 160 | Income Payment Made by Top Withholding Agents to Their Local/Resident Supplier of Services',
            natureOfIncome: 'Income Payment Made by Top Withholding Agents to Their Local/Resident Supplier of Services',
            sortOrder: 10,
            taxRate: '2',
            taxExempt: false,
            defaultAccountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
            defaultAccountCode: '2010002002',
            defaultAccountTitle: 'Expanded Withholding Tax',
            status: TaxStatus.ACTIVE,
          },
        ],
      },
    ]);
    expect(result.options).toHaveLength(1);
  });

  it('keeps tax options visible when the company account mapping is missing', async () => {
    const { prisma, service } = createService();
    prisma.tax.findMany.mockResolvedValue([
      {
        ...createTax(),
        postingRules: [createPostingRule()],
      },
    ]);
    prisma.companyAccountMapping.findMany.mockResolvedValue([]);

    const result = await service.listTaxDefaultAccountOptions(superAdminUser, 'purchase-ewt');

    expect(result.groups[0].options[0]).toEqual(
      expect.objectContaining({
        defaultAccountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
        defaultAccountCode: null,
        defaultAccountTitle: null,
      }),
    );
  });

  it('requires an active company for company-scoped default-account lookups', async () => {
    const { service } = createService();

    await expect(service.listTaxDefaultAccountOptions({ ...superAdminUser, companyId: null })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-super-admin users without active company membership', async () => {
    const { prisma, service } = createService();
    prisma.membership.findUnique.mockResolvedValue({ status: MembershipStatus.REMOVED });

    await expect(
      service.listTaxesWithDefaultAccounts(
        {
          ...superAdminUser,
          role: AppRole.USER,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_companyId: {
          userId: 1,
          companyId: 11,
        },
      },
      select: {
        status: true,
      },
    });
  });

  it('throws not found for an unknown tax source key', async () => {
    const { prisma, service } = createService();
    prisma.tax.findUnique.mockResolvedValue(null);

    await expect(service.getTax('missing-tax')).rejects.toBeInstanceOf(NotFoundException);
  });
});
