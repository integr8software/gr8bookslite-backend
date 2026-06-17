import type { Permission, TransactionNumberSequence } from '@prisma/client';

type PermissionSummary = Pick<Permission, 'code' | 'id' | 'name'>;
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

export function mapPermissionTransactionNumberSetup({
  activeBranchIds,
  permission,
  sequences,
}: {
  activeBranchIds: number[];
  permission: PermissionSummary;
  sequences: SequenceSummary[];
}) {
  const activeBranchIdSet = new Set(activeBranchIds);
  const scopedSequences = sequences.filter((sequence) =>
    activeBranchIdSet.has(sequence.branchUnitId),
  );
  const firstSequence = scopedSequences[0];
  const branchUnitIds = scopedSequences.map((sequence) => sequence.branchUnitId);
  const coversEveryBranch =
    activeBranchIds.length > 0 &&
    activeBranchIds.every((branchId) => branchUnitIds.includes(branchId));
  const scope = sequences.length === 0 || coversEveryBranch ? 'all' : 'branch';

  return {
    id: permission.id,
    permissionId: permission.id,
    moduleCode: permission.code,
    moduleName: permission.name,
    inputMode: firstSequence?.inputMode === 'MANUAL' ? 'Manual' : 'Auto',
    prefix: firstSequence?.prefix ?? permission.code,
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
