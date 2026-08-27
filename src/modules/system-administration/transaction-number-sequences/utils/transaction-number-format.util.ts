import type { TransactionNumberSequence } from '@prisma/client';

export function formatTransactionNumber(sequence: Pick<TransactionNumberSequence, 'padding' | 'prefix' | 'suffix'>, runningNumber: number) {
  return `${sequence.prefix}${String(runningNumber).padStart(sequence.padding, '0')}${sequence.suffix}`;
}
