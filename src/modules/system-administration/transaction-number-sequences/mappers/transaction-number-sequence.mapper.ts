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
  const firstSequence = sequences[0];
  const branchUnitIds = sequences.map((sequence) => sequence.branchUnitId);
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
    padding: firstSequence?.padding ?? 6,
    startingNumber: firstSequence?.startingNumber ?? 1,
    currentNumber: firstSequence?.currentNumber ?? 1,
    scope,
    branchUnitId: branchUnitIds[0] ?? null,
    branchUnitIds,
    status: firstSequence?.status === 'INACTIVE' ? 'Inactive' : 'Active',
  };
}
