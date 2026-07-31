import { TransactionNumberInputMode, TransactionNumberStatus } from '@prisma/client';

export function groupSequencesByModuleId<TSequence extends { moduleId: number }>(sequences: TSequence[]) {
  return sequences.reduce((groups, sequence) => {
    const current = groups.get(sequence.moduleId) ?? [];

    current.push(sequence);
    groups.set(sequence.moduleId, current);

    return groups;
  }, new Map<number, TSequence[]>());
}

export function mapTransactionNumberInputMode(inputMode: 'Auto' | 'Manual') {
  return inputMode === 'Auto' ? TransactionNumberInputMode.AUTO : TransactionNumberInputMode.MANUAL;
}

export function mapTransactionNumberStatus(status: 'Active' | 'Inactive') {
  return status === 'Active' ? TransactionNumberStatus.ACTIVE : TransactionNumberStatus.INACTIVE;
}

