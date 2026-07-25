import { Prisma, TaxCalculationMethod, TaxEntrySide, TaxTreatment } from '@prisma/client';

const ZeroTaxTreatments = new Set<TaxTreatment>([TaxTreatment.ZERO_RATED, TaxTreatment.EXEMPT, TaxTreatment.OUT_OF_SCOPE]);

export function calculateTaxAmounts(
  inputAmount: Prisma.Decimal,
  percentage: Prisma.Decimal,
  calculationMethod: TaxCalculationMethod,
  treatment: TaxTreatment,
  recoverablePercentage: Prisma.Decimal,
  currencyScale: number,
) {
  const rate = percentage.dividedBy(100);
  const unroundedTaxAmount = ZeroTaxTreatments.has(treatment)
    ? new Prisma.Decimal(0)
    : calculationMethod === TaxCalculationMethod.INCLUSIVE
      ? inputAmount.mul(rate).dividedBy(new Prisma.Decimal(1).plus(rate))
      : inputAmount.mul(rate);
  const taxAmount = roundTaxAmount(unroundedTaxAmount, currencyScale);
  const taxableAmount =
    calculationMethod === TaxCalculationMethod.INCLUSIVE
      ? roundTaxAmount(inputAmount.minus(taxAmount), currencyScale)
      : roundTaxAmount(inputAmount, currencyScale);
  const recoverableAmount = roundTaxAmount(taxAmount.mul(recoverablePercentage).dividedBy(100), currencyScale);

  return { taxableAmount, taxAmount, recoverableAmount };
}

export function roundTaxAmount(value: Prisma.Decimal, scale: number) {
  return value.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP);
}

export function oppositeTaxEntrySide(side: TaxEntrySide) {
  return side === TaxEntrySide.DEBIT ? TaxEntrySide.CREDIT : TaxEntrySide.DEBIT;
}
