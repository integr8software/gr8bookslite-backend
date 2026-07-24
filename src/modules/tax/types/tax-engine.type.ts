import { Prisma, TaxCalculationMethod, TaxEntrySide, TaxPostingEvent, TaxTransactionScope } from '@prisma/client';

export type CalculatedTaxPosting = {
  accountRole: string;
  accountId: string;
  accountCode: string;
  accountTitle: string;
  side: TaxEntrySide;
  amount: string;
};

export type CalculatedTaxLine = {
  taxDefinitionId: string;
  taxRateVersionId: string | null;
  taxCode: string;
  taxName: string;
  jurisdictionCode: string;
  transactionScope: Exclude<TaxTransactionScope, 'BOTH'>;
  postingEvent: TaxPostingEvent;
  percentageApplied: string;
  calculationMethod: TaxCalculationMethod;
  inputAmount: string;
  taxableAmount: string;
  taxAmount: string;
  recoverableAmount: string;
  postings: CalculatedTaxPosting[];
};

export type ResolvedCalculatedTaxPosting = Omit<CalculatedTaxPosting, 'accountId' | 'amount'> & {
  accountId: bigint;
  amount: Prisma.Decimal;
};

export type ResolvedCalculatedTaxLine = Omit<
  CalculatedTaxLine,
  'taxDefinitionId' | 'taxRateVersionId' | 'percentageApplied' | 'inputAmount' | 'taxableAmount' | 'taxAmount' | 'recoverableAmount' | 'postings'
> & {
  taxDefinitionId: bigint;
  taxRateVersionId: bigint;
  percentageApplied: Prisma.Decimal;
  inputAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  recoverableAmount: Prisma.Decimal;
  postings: ResolvedCalculatedTaxPosting[];
};

export type RecordTransactionTaxesInput = {
  companyId: number;
  sourceType: string;
  sourceId: string;
  transactionDate: Date;
  currencyCode: string;
  lines: CalculatedTaxLine[];
};
