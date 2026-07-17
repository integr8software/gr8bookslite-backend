import { Prisma, TermDateMode, TermStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type TermWriteClient = Pick<PrismaService, 'term'> | Prisma.TransactionClient;

export const TermMaintenanceSeedRecords = [
  { name: 'Due on Receipt', dateMode: TermDateMode.DAY, period: 0 },
  { name: 'Cash on Delivery', dateMode: TermDateMode.DAY, period: 0 },
  { name: 'Cash in Advance', dateMode: TermDateMode.DAY, period: 0 },
  { name: 'Next Day Payment', dateMode: TermDateMode.DAY, period: 1 },
  { name: 'Grace Period - 7 Days', dateMode: TermDateMode.DAY, period: 7 },
  { name: 'Grace Period - 15 Days', dateMode: TermDateMode.DAY, period: 15 },
  { name: 'Semi-Monthly', dateMode: TermDateMode.DAY, period: 15 },
  { name: 'Monthly', dateMode: TermDateMode.MONTH, period: 1 },
  { name: 'Two Months', dateMode: TermDateMode.MONTH, period: 2 },
  { name: 'Quarterly', dateMode: TermDateMode.MONTH, period: 3 },
  { name: 'Semi-annual', dateMode: TermDateMode.MONTH, period: 6 },
  { name: 'Trial Period - 1 month', dateMode: TermDateMode.MONTH, period: 1 },
  { name: 'Probationary Period', dateMode: TermDateMode.MONTH, period: 6 },
  { name: 'Annual', dateMode: TermDateMode.YEAR, period: 1 },
  { name: 'Annual Review Period', dateMode: TermDateMode.YEAR, period: 1 },
  { name: 'Two Years', dateMode: TermDateMode.YEAR, period: 2 },
  { name: 'Three Years', dateMode: TermDateMode.YEAR, period: 3 },
  { name: 'Contract Renewal Period', dateMode: TermDateMode.YEAR, period: 1 },
  { name: 'Warranty Period - 1 Year', dateMode: TermDateMode.YEAR, period: 1 },
  { name: 'Warranty Period - 2 Years', dateMode: TermDateMode.YEAR, period: 2 },
  { name: 'Long-Term Agreement', dateMode: TermDateMode.YEAR, period: 5 },
] as const;

export async function seedCompanyTermMaintenanceDefaults(tx: TermWriteClient, companyId: number) {
  const existingTerms = await tx.term.findMany({
    where: {
      companyId,
      name: {
        in: TermMaintenanceSeedRecords.map((term) => term.name),
      },
    },
    select: { name: true },
  });
  const existingNames = new Set(existingTerms.map((term) => term.name));
  const missingTerms = TermMaintenanceSeedRecords.filter((term) => !existingNames.has(term.name));

  if (missingTerms.length === 0) {
    return 0;
  }

  const result = await tx.term.createMany({
    data: missingTerms.map((term) => ({
      companyId,
      name: term.name,
      description: '',
      dateMode: term.dateMode,
      period: term.period,
      status: TermStatus.ACTIVE,
      createdByUserId: null,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
