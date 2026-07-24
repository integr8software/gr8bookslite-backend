import { ChartAccountStatus, Prisma, TaxCalculationMethod, TaxEntrySide, TaxPostingEvent, TaxTransactionScope, TaxTreatment } from '@prisma/client';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxTransactionService } from './services/tax-transaction.service';
import { calculateTaxAmounts } from './utils/tax-calculation.util';

describe('Tax engine services', () => {
  it('calculates multiple taxes and resolves separate company-owned posting accounts', async () => {
    const taxes = [
      buildTaxDefinition({
        id: 1n,
        code: 'PH-VAT-12',
        name: 'VAT 12%',
        percentage: 12,
        accountRole: 'INPUT_TAX_ACCOUNT',
        entrySide: TaxEntrySide.DEBIT,
      }),
      buildTaxDefinition({
        id: 2n,
        code: 'PH-EWT-2',
        name: 'EWT 2%',
        percentage: 2,
        accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
        entrySide: TaxEntrySide.CREDIT,
      }),
    ];
    const findFirst = jest.fn().mockResolvedValueOnce(taxes[0]).mockResolvedValueOnce(taxes[1]);
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([buildAccountMapping('INPUT_TAX_ACCOUNT', 101n, 'Input VAT')])
      .mockResolvedValueOnce([buildAccountMapping('EXPANDED_WITHHOLDING_TAX_ACCOUNT', 202n, 'Expanded Withholding Tax')]);
    const service = new TaxCalculationService({
      taxMaintenance: { findFirst },
      companyAccountMapping: { findMany },
    } as never);

    const result = await service.calculate(42, {
      transactionDate: '2026-07-24',
      transactionScope: TaxTransactionScope.PURCHASE,
      postingEvent: TaxPostingEvent.RECOGNITION,
      currencyCode: 'PHP',
      taxes: [
        { taxId: '1', taxableAmount: 100 },
        { taxId: '2', taxableAmount: 100 },
      ],
    });

    expect(result.totals.taxAmount).toBe('14.00');
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      taxableAmount: '100',
      taxAmount: '12',
      postings: [
        {
          accountRole: 'INPUT_TAX_ACCOUNT',
          accountTitle: 'Input VAT',
          side: TaxEntrySide.DEBIT,
          amount: '12',
        },
      ],
    });
    expect(result.lines[1]).toMatchObject({
      taxAmount: '2',
      postings: [
        {
          accountRole: 'EXPANDED_WITHHOLDING_TAX_ACCOUNT',
          accountTitle: 'Expanded Withholding Tax',
          side: TaxEntrySide.CREDIT,
          amount: '2',
        },
      ],
    });
  });

  it('extracts inclusive VAT from a tax-inclusive amount', () => {
    const amounts = calculateTaxAmounts(
      new Prisma.Decimal(112),
      new Prisma.Decimal(12),
      TaxCalculationMethod.INCLUSIVE,
      TaxTreatment.STANDARD,
      new Prisma.Decimal(100),
      2,
    );

    expect(amounts.taxableAmount.toString()).toBe('100');
    expect(amounts.taxAmount.toString()).toBe('12');
    expect(amounts.recoverableAmount.toString()).toBe('12');
  });

  it('creates reversal lines using the original snapshots and opposite entry side', async () => {
    const original = {
      id: 9n,
      companyId: 42,
      sourceType: 'PURCHASE_INVOICE',
      sourceId: '88',
      sequence: 1,
      lineType: 'ORIGINAL',
      originalTaxLineId: null,
      taxDefinitionId: 1n,
      taxRateVersionId: 3n,
      transactionScope: TaxTransactionScope.PURCHASE,
      postingEvent: TaxPostingEvent.RECOGNITION,
      taxCodeSnapshot: 'PH-VAT-12',
      taxNameSnapshot: 'VAT 12%',
      jurisdictionCodeSnapshot: 'PH',
      percentageApplied: new Prisma.Decimal(12),
      calculationMethodSnapshot: TaxCalculationMethod.EXCLUSIVE,
      taxableAmount: new Prisma.Decimal(100),
      taxAmount: new Prisma.Decimal(12),
      recoverableAmount: new Prisma.Decimal(12),
      postingAccountId: 101n,
      postingAccountCodeSnapshot: '2010002011',
      postingAccountTitleSnapshot: 'Input VAT',
      postingAccountRole: 'INPUT_TAX_ACCOUNT',
      postingSide: TaxEntrySide.DEBIT,
      currencyCode: 'PHP',
      transactionDate: new Date('2026-07-24'),
      createdAt: new Date('2026-07-24'),
    };
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const service = new TaxTransactionService({
      transactionTaxLine: {
        findMany: jest.fn().mockResolvedValue([original]),
        create,
      },
      $transaction: jest.fn().mockImplementation((operations) => Promise.all(operations)),
    } as never);

    const reversal = await service.reverseTransactionTaxes(42, 'PURCHASE_INVOICE', '88', 'PURCHASE_REVERSAL', '99');

    expect(reversal[0]).toMatchObject({
      originalTaxLineId: 9n,
      postingSide: TaxEntrySide.CREDIT,
      taxAmount: new Prisma.Decimal(12),
      postingAccountTitleSnapshot: 'Input VAT',
    });
  });
});

function buildTaxDefinition(input: { id: bigint; code: string; name: string; percentage: number; accountRole: string; entrySide: TaxEntrySide }) {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    jurisdictionCode: 'PH',
    treatment: TaxTreatment.STANDARD,
    rateVersions: [
      {
        id: input.id + 10n,
        percentage: new Prisma.Decimal(input.percentage),
        calculationMethod: TaxCalculationMethod.EXCLUSIVE,
        recoverablePercentage: new Prisma.Decimal(100),
      },
    ],
    postingRules: [
      {
        id: input.id + 20n,
        accountRole: input.accountRole,
        entrySide: input.entrySide,
        amountSource: 'TAX_AMOUNT',
      },
    ],
  };
}

function buildAccountMapping(accountRole: string, id: bigint, accountTitle: string) {
  return {
    accountRole,
    chartAccount: {
      id,
      companyId: 42,
      accountCode: id.toString(),
      accountTitle,
      status: ChartAccountStatus.ACTIVE,
      deletedAt: null,
      isPostingAccount: true,
    },
  };
}
