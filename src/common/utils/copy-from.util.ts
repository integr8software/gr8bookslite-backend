import { Prisma } from '@prisma/client';
import { roundMoney } from './money.util';

export type CopiedDetailAmountInput = {
  amount?: number | Prisma.Decimal;
  debit?: number | Prisma.Decimal;
  disburseAmount?: number | Prisma.Decimal;
  grossAmount?: number | Prisma.Decimal;
};

export function getCopiedDetailAmount(detail: CopiedDetailAmountInput) {
  return roundMoney(Number(detail.grossAmount || detail.amount || detail.debit || detail.disburseAmount || 0));
}

export function getCopiedDetailPayableAmount(detail: CopiedDetailAmountInput) {
  return roundMoney(Number(detail.disburseAmount || detail.amount || detail.debit || detail.grossAmount || 0));
}
