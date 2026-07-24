import { Prisma, TaxMaintenanceStatus } from '@prisma/client';

export function mapTaxRateVersion(rate: {
  id: bigint;
  taxDefinitionId: bigint;
  percentage: Prisma.Decimal;
  calculationMethod: string;
  recoverablePercentage: Prisma.Decimal;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: TaxMaintenanceStatus;
}) {
  return {
    ...rate,
    id: rate.id.toString(),
    taxDefinitionId: rate.taxDefinitionId.toString(),
    percentage: rate.percentage.toString(),
    recoverablePercentage: rate.recoverablePercentage.toString(),
  };
}
