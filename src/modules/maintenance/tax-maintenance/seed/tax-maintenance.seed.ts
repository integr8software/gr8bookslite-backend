import {
  ChartAccountStatus,
  Prisma,
  TaxMaintenanceStatus,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const DefaultTaxMaintenanceRows = [
  { name: 'VAT Registered', percentage: 12 },
  { name: 'Zero Rated', percentage: 0 },
  { name: 'Non-VAT', percentage: 0 },
  { name: 'Exempt', percentage: 0 },
  { name: 'Capital Goods', percentage: 12 },
  { name: 'Other Than Capital Goods', percentage: 12 },
  { name: 'Services', percentage: 12 },
] as const;

const DefaultTaxMaintenanceAccountTitles = {
  inputVatAccountId: 'Input Tax',
  outputVatAccountId: 'Output Tax',
  vatPayableAccountId: 'VAT Payable',
  deferredInputTaxAccountId: 'Deferred Input Tax',
  deferredOutputVatAccountId: 'Deferred Output VAT',
} as const;

type TaxMaintenanceWriteClient =
  | Pick<PrismaService, 'chartAccount' | 'taxMaintenance'>
  | Prisma.TransactionClient;

export const TaxMaintenanceSeedRecords = DefaultTaxMaintenanceRows;

export async function seedCompanyTaxMaintenanceDefaults(
  tx: TaxMaintenanceWriteClient,
  companyId: number,
) {
  const accountIds = await getDefaultAccountIds(tx, companyId);

  const results = await Promise.all(
    TaxMaintenanceSeedRecords.map((row) =>
      tx.taxMaintenance.upsert({
        where: {
          companyId_name: {
            companyId,
            name: row.name,
          },
        },
        update: {
          percentage: new Prisma.Decimal(row.percentage),
          deletedAt: null,
          ...accountIds,
        },
        create: {
          companyId,
          name: row.name,
          percentage: new Prisma.Decimal(row.percentage),
          status: TaxMaintenanceStatus.ACTIVE,
          createdByUserId: null,
          ...accountIds,
        },
      }),
    ),
  );

  return results.length;
}

async function getDefaultAccountIds(
  tx: TaxMaintenanceWriteClient,
  companyId: number,
) {
  const titles = Object.values(DefaultTaxMaintenanceAccountTitles);
  const accounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      deletedAt: null,
      isPostingAccount: true,
      status: ChartAccountStatus.ACTIVE,
      accountTitle: { in: titles },
    },
    select: { id: true, accountTitle: true },
  });
  const idByTitle = new Map(
    accounts.map((account) => [account.accountTitle, account.id]),
  );

  return {
    inputVatAccountId: idByTitle.get(
      DefaultTaxMaintenanceAccountTitles.inputVatAccountId,
    ),
    outputVatAccountId: idByTitle.get(
      DefaultTaxMaintenanceAccountTitles.outputVatAccountId,
    ),
    vatPayableAccountId: idByTitle.get(
      DefaultTaxMaintenanceAccountTitles.vatPayableAccountId,
    ),
    deferredInputTaxAccountId: idByTitle.get(
      DefaultTaxMaintenanceAccountTitles.deferredInputTaxAccountId,
    ),
    deferredOutputVatAccountId: idByTitle.get(
      DefaultTaxMaintenanceAccountTitles.deferredOutputVatAccountId,
    ),
  };
}
