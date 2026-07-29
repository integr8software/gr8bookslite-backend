import type { Tax } from '@prisma/client';

export function mapTax(tax: Tax) {
  return {
    id: tax.id,
    sourceKey: tax.sourceKey,
    transactionType: tax.transactionType,
    taxType: tax.taxType,
    taxCode: tax.taxCode,
    taxDescription: tax.taxDescription,
    taxRate: tax.taxRate.toString(),
    taxExempt: tax.taxExempt,
    taxAlias: tax.taxAlias,
    atc: tax.atc,
    officialAtcCode: tax.officialAtcCode,
    natureOfIncome: tax.natureOfIncome,
    sortOrder: tax.sortOrder,
    status: tax.status,
  };
}

export function mapTaxAutocomplete(tax: Tax) {
  const mappedTax = mapTax(tax);

  return {
    label: tax.taxDescription,
    description: tax.natureOfIncome ?? tax.officialAtcCode ?? `${tax.transactionType} - ${tax.taxType}`,
    tax: mappedTax,
    taxCode: mappedTax,
  };
}
