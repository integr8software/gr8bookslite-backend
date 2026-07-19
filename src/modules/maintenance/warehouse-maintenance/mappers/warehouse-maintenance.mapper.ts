import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { WarehouseMaintenanceWithBranches } from '../types/warehouse-maintenance-with-branches.type';

export function mapWarehouse(warehouse: WarehouseMaintenanceWithBranches, userNames: Map<number, string>) {
  const branches = warehouse.branches.map((branch) => ({
    id: branch.unit.id.toString(),
    code: branch.unit.code ?? '',
    name: branch.unit.name,
  }));

  return {
    id: warehouse.id.toString(),
    code: warehouse.code,
    name: warehouse.name,
    branchUnitIds: branches.map((branch) => branch.id),
    branchAvailabilityMode: warehouse.branchAvailabilityMode,
    branches,
    managerName: warehouse.managerName,
    status: warehouse.status,
    address: warehouse.address,
    contactNo: warehouse.contactNo,
    description: warehouse.description,
    createdBy: warehouse.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(warehouse.createdByUserId) ?? null),
    createdAt: warehouse.createdAt,
    updatedBy: (warehouse.updatedByUserId && userNames.get(warehouse.updatedByUserId)) ?? null,
    updatedAt: warehouse.updatedAt,
  };
}
