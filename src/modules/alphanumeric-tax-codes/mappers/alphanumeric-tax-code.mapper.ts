import type { AlphanumericTaxCode } from '@prisma/client';

export function mapAlphanumericTaxCode(taxCode: AlphanumericTaxCode) {
  return {
    id: taxCode.id,
    sourceKey: taxCode.sourceKey,
    transactionType: taxCode.transactionType,
    taxType: taxCode.taxType,
    taxCode: taxCode.taxCode,
    taxDescription: taxCode.taxDescription,
    taxRate: taxCode.taxRate.toString(),
    taxAlias: taxCode.taxAlias,
    atc: taxCode.atc,
    officialAtcCode: taxCode.officialAtcCode,
    natureOfIncome: taxCode.natureOfIncome,
  };
}

export function mapAlphanumericTaxCodeAutocomplete(taxCode: AlphanumericTaxCode) {
  const mappedTaxCode = mapAlphanumericTaxCode(taxCode);

  return {
    label: taxCode.taxDescription,
    description: taxCode.natureOfIncome ?? taxCode.officialAtcCode ?? `${taxCode.transactionType} - ${taxCode.taxType}`,
    taxCode: mappedTaxCode,
  };
}
