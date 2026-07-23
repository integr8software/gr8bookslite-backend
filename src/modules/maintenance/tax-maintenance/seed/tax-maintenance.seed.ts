import { ChartAccountStatus, ChartAccountType, Prisma, TaxMaintenanceStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getTaxMaintenanceDefaultAccountIds } from '../utils/tax-maintenance-accounting-account.util';

const DefaultTaxMaintenanceRows = [
  { name: 'VAT Registered', percentage: 12, isExempted: false },
  { name: 'Zero Rated', percentage: 0, isExempted: false },
  { name: 'Non-VAT', percentage: 0, isExempted: true },
  { name: 'Exempt', percentage: 0, isExempted: true },
  { name: 'Capital Goods', percentage: 12, isExempted: false },
  { name: 'Other Than Capital Goods', percentage: 12, isExempted: false },
  { name: 'Services', percentage: 12, isExempted: false },
  { name: 'VAT Exempt', percentage: 0, isExempted: true },
  { name: 'VAT Inclusive', percentage: 12, isExempted: false },
  { name: 'VAT Exclusive', percentage: 12, isExempted: false },
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
          isExempted: row.isExempted,
          deletedAt: null,
          ...accountIds,
        },
        create: {
          companyId,
          name: row.name,
          percentage: new Prisma.Decimal(row.percentage),
          isExempted: row.isExempted,
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
