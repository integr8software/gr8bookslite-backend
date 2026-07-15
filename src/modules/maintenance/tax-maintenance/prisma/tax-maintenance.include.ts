import { Prisma } from '@prisma/client';

export const TaxMaintenanceInclude = {
  inputVatAccount: true,
  outputVatAccount: true,
  vatPayableAccount: true,
  deferredInputTaxAccount: true,
  deferredOutputVatAccount: true,
} satisfies Prisma.TaxMaintenanceInclude;
