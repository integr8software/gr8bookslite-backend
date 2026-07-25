import {
  Prisma,
  TaxAmountSource,
  TaxCalculationMethod,
  TaxEntrySide,
  TaxMaintenanceStatus,
  TaxPostingEvent,
  TaxSystem,
  TaxTransactionScope,
  TaxTreatment,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type TaxWriteClient = Pick<PrismaService, 'taxMaintenance' | 'taxPostingRule' | 'taxRateVersion'> | Prisma.TransactionClient;
type CompanyTaxWriteClient = Pick<PrismaService, 'companyTaxConfiguration' | 'taxMaintenance'> | Prisma.TransactionClient;
const DefaultEffectiveFrom = new Date('1900-01-01T00:00:00.000Z');
const TaxSystemsWithVatStylePosting = new Set<TaxSystem>([TaxSystem.VAT, TaxSystem.GST, TaxSystem.SALES_TAX]);

export const PhilippineTaxTemplate = {
  code: 'PH-DEFAULT',
  jurisdictionCode: 'PH',
  version: 1,
} as const;

export const TaxSeedRecords = [
  {
    code: 'PH-VAT-12-EXCL',
    sortOrder: 10,
    name: 'VAT 12% Exclusive',
    description: 'Standard Philippine VAT with tax added to the base price.',
    taxSystem: TaxSystem.VAT,
    treatment: TaxTreatment.STANDARD,
    transactionScope: TaxTransactionScope.BOTH,
    percentage: 12,
    calculationMethod: TaxCalculationMethod.EXCLUSIVE,
    recoverable: true,
  },
  {
    code: 'PH-VAT-12-INCL',
    sortOrder: 20,
    name: 'VAT 12% Inclusive',
    description: 'Standard Philippine VAT already included in the entered price.',
    taxSystem: TaxSystem.VAT,
    treatment: TaxTreatment.STANDARD,
    transactionScope: TaxTransactionScope.BOTH,
    percentage: 12,
    calculationMethod: TaxCalculationMethod.INCLUSIVE,
    recoverable: true,
  },
  {
    code: 'PH-VAT-ZERO',
    sortOrder: 30,
    name: 'VAT Zero-Rated',
    description: 'Philippine VAT-taxable transaction subject to a zero percent rate.',
    taxSystem: TaxSystem.VAT,
    treatment: TaxTreatment.ZERO_RATED,
    transactionScope: TaxTransactionScope.BOTH,
    percentage: 0,
    calculationMethod: TaxCalculationMethod.EXCLUSIVE,
    recoverable: true,
  },
  {
    code: 'PH-VAT-EXEMPT',
    sortOrder: 40,
    name: 'VAT Exempt',
    description: 'Transaction exempt from Philippine VAT; distinct from a zero-rated sale.',
    taxSystem: TaxSystem.VAT,
    treatment: TaxTreatment.EXEMPT,
    transactionScope: TaxTransactionScope.BOTH,
    percentage: 0,
    calculationMethod: TaxCalculationMethod.EXCLUSIVE,
    recoverable: false,
  },
  {
    code: 'PH-PT-3',
    sortOrder: 50,
    name: 'Percentage Tax 3%',
    description: 'General Section 116 percentage tax for qualifying non-VAT taxpayers.',
    taxSystem: TaxSystem.PERCENTAGE_TAX,
    treatment: TaxTreatment.STANDARD,
    transactionScope: TaxTransactionScope.SALE,
    percentage: 3,
    calculationMethod: TaxCalculationMethod.EXCLUSIVE,
    recoverable: false,
  },
  {
    code: 'PH-NO-TAX',
    sortOrder: 60,
    name: 'No Tax / Out of Scope',
    description: 'Transaction outside the scope of the configured Philippine transaction taxes.',
    taxSystem: TaxSystem.OTHER,
    treatment: TaxTreatment.OUT_OF_SCOPE,
    transactionScope: TaxTransactionScope.BOTH,
    percentage: 0,
    calculationMethod: TaxCalculationMethod.EXCLUSIVE,
    recoverable: false,
  },
] as const;

export async function seedGlobalTaxDefaults(tx: TaxWriteClient) {
  const results = await Promise.all(
    TaxSeedRecords.map(async (record) => {
      const tax = await tx.taxMaintenance.upsert({
        where: {
          code: record.code,
        },
        update: {
          name: record.name,
          description: record.description,
          jurisdictionCode: PhilippineTaxTemplate.jurisdictionCode,
          taxSystem: record.taxSystem,
          treatment: record.treatment,
          transactionScope: record.transactionScope,
          percentage: new Prisma.Decimal(record.percentage),
          calculationMethod: record.calculationMethod,
          recoverable: record.recoverable,
          sourceTemplateCode: PhilippineTaxTemplate.code,
          sourceTemplateVersion: PhilippineTaxTemplate.version,
          sortOrder: record.sortOrder,
          status: TaxMaintenanceStatus.ACTIVE,
          deletedAt: null,
        },
        create: {
          code: record.code,
          name: record.name,
          description: record.description,
          jurisdictionCode: PhilippineTaxTemplate.jurisdictionCode,
          taxSystem: record.taxSystem,
          treatment: record.treatment,
          transactionScope: record.transactionScope,
          percentage: new Prisma.Decimal(record.percentage),
          calculationMethod: record.calculationMethod,
          recoverable: record.recoverable,
          sourceTemplateCode: PhilippineTaxTemplate.code,
          sourceTemplateVersion: PhilippineTaxTemplate.version,
          sortOrder: record.sortOrder,
          status: TaxMaintenanceStatus.ACTIVE,
          createdByUserId: null,
        },
        select: { id: true },
      });

      await tx.taxRateVersion.upsert({
        where: {
          taxDefinitionId_effectiveFrom: {
            taxDefinitionId: tax.id,
            effectiveFrom: DefaultEffectiveFrom,
          },
        },
        update: {
          percentage: new Prisma.Decimal(record.percentage),
          calculationMethod: record.calculationMethod,
          recoverablePercentage: new Prisma.Decimal(record.recoverable ? 100 : 0),
          status: TaxMaintenanceStatus.ACTIVE,
        },
        create: {
          taxDefinitionId: tax.id,
          percentage: new Prisma.Decimal(record.percentage),
          calculationMethod: record.calculationMethod,
          recoverablePercentage: new Prisma.Decimal(record.recoverable ? 100 : 0),
          effectiveFrom: DefaultEffectiveFrom,
          status: TaxMaintenanceStatus.ACTIVE,
        },
      });

      if (TaxSystemsWithVatStylePosting.has(record.taxSystem)) {
        await Promise.all(
          [
            { transactionScope: TaxTransactionScope.PURCHASE, accountRole: 'INPUT_TAX_ACCOUNT', entrySide: TaxEntrySide.DEBIT },
            { transactionScope: TaxTransactionScope.SALE, accountRole: 'OUTPUT_VAT_ACCOUNT', entrySide: TaxEntrySide.CREDIT },
          ].map((rule) =>
            tx.taxPostingRule.upsert({
              where: {
                taxDefinitionId_transactionScope_postingEvent_accountRole: {
                  taxDefinitionId: tax.id,
                  transactionScope: rule.transactionScope,
                  postingEvent: TaxPostingEvent.RECOGNITION,
                  accountRole: rule.accountRole,
                },
              },
              update: {
                entrySide: rule.entrySide,
                amountSource: TaxAmountSource.TAX_AMOUNT,
                isActive: true,
              },
              create: {
                taxDefinitionId: tax.id,
                transactionScope: rule.transactionScope,
                postingEvent: TaxPostingEvent.RECOGNITION,
                accountRole: rule.accountRole,
                entrySide: rule.entrySide,
                amountSource: TaxAmountSource.TAX_AMOUNT,
              },
            }),
          ),
        );
      }

      return tax;
    }),
  );

  return results.length;
}

export async function seedCompanyTaxConfigurationDefaults(tx: CompanyTaxWriteClient, companyId: number) {
  const taxes = await tx.taxMaintenance.findMany({
    where: {
      status: TaxMaintenanceStatus.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  await tx.companyTaxConfiguration.createMany({
    data: taxes.map((tax) => ({
      companyId,
      taxDefinitionId: tax.id,
    })),
    skipDuplicates: true,
  });
}
