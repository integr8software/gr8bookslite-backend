import { Prisma } from '@prisma/client';

export const TaxMaintenanceInclude = {
  inputVatAccount: true,
  outputVatAccount: true,
  deferredVatAccount: true,
  expandedWithholdingTaxAccount: true,
  creditableWithholdingTaxAccount: true,
  withholdingVatableTaxAccount: true,
  finalWithholdingTaxAccount: true,
} satisfies Prisma.TaxMaintenanceInclude;
