import { ChartAccountStatus, ChartAccountType, Prisma, TaxMaintenanceStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getTaxMaintenanceDefaultAccountIds } from '../utils/tax-maintenance-accounting-account.util';

const DefaultTaxMaintenanceRows = [
  { name: 'VAT Registered', percentage: 12 },
  { name: 'Zero Rated', percentage: 0 },
  { name: 'Non-VAT', percentage: 0 },
  { name: 'Exempt', percentage: 0 },
  { name: 'Capital Goods', percentage: 12 },
  { name: 'Other Than Capital Goods', percentage: 12 },
  { name: 'Services', percentage: 12 },
] as const;

type TaxMaintenanceWriteClient = Pick<PrismaService, 'chartAccount' | 'taxMaintenance'> | Prisma.TransactionClient;

export const TaxMaintenanceSeedRecords = DefaultTaxMaintenanceRows;

export async function seedCompanyTaxMaintenanceDefaults(tx: TaxMaintenanceWriteClient, companyId: number) {
  const accountIds = await getCompanyTaxMaintenanceDefaultAccountIds(tx, companyId);

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
        select: { id: true },
      }),
    ),
  );

  return results.length;
}

export async function getCompanyTaxMaintenanceDefaultAccountIds(tx: TaxMaintenanceWriteClient, companyId: number) {
  const accounts = await tx.chartAccount.findMany({
    where: {
      companyId,
      deletedAt: null,
      accountType: ChartAccountType.LIABILITY,
      isPostingAccount: true,
      status: ChartAccountStatus.ACTIVE,
    },
  });

  return getTaxMaintenanceDefaultAccountIds(accounts);
}
