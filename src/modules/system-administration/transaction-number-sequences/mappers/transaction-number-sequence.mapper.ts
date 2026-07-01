import type { Module, TransactionNumberSequence } from '@prisma/client';

type ModuleSummary = Pick<Module, 'code' | 'id' | 'name'>;
type SequenceSummary = Pick<
  TransactionNumberSequence,
  | 'branchUnitId'
  | 'currentNumber'
  | 'id'
  | 'inputMode'
  | 'padding'
  | 'prefix'
  | 'startingNumber'
  | 'status'
  | 'suffix'
>;

export function mapModuleTransactionNumberSetup({
  activeBranchIds,
  module,
  sequences,
}: {
  activeBranchIds: number[];
  module: ModuleSummary;
  sequences: SequenceSummary[];
}) {
  const activeBranchIdSet = new Set(activeBranchIds);
  const scopedSequences = sequences.filter((sequence) =>
    activeBranchIdSet.has(sequence.branchUnitId),
  );
  const firstSequence = scopedSequences[0];
  const branchUnitIds = scopedSequences.map(
    (sequence) => sequence.branchUnitId,
  );
  const coversEveryBranch =
    activeBranchIds.length > 0 &&
    activeBranchIds.every((branchId) => branchUnitIds.includes(branchId));
  const scope = sequences.length === 0 || coversEveryBranch ? 'all' : 'branch';

  return {
    id: module.id,
    moduleId: module.id,
    moduleCode: module.code,
    moduleName: module.name,
    inputMode: firstSequence?.inputMode === 'MANUAL' ? 'Manual' : 'Auto',
    prefix: firstSequence?.prefix ?? module.code,
    suffix: firstSequence?.suffix ?? '',
    padding: firstSequence?.padding ?? 6,
    startingNumber: firstSequence?.startingNumber ?? 1,
    currentNumber: firstSequence?.currentNumber ?? 1,
    scope,
    branchUnitId: branchUnitIds[0] ?? null,
    branchUnitIds,
    status: firstSequence?.status === 'INACTIVE' ? 'Inactive' : 'Active',
  };
}
