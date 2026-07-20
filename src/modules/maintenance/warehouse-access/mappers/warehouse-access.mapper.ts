import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { WarehouseAccessWithRelations } from '../types/warehouse-access-with-relations.type';

export function mapWarehouseAccess(access: WarehouseAccessWithRelations, userNames: Map<number, string>) {
  return {
    id: access.id.toString(),
    warehouseId: access.warehouseId.toString(),
    warehouseCode: access.warehouse.code,
    warehouseName: access.warehouse.name,
    userId: access.userId,
    userName: access.user.name,
    userEmail: access.user.email,
    accessLevel: access.accessLevel,
    permissions: access.permissions,
    status: access.status,
    createdBy: access.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(access.createdByUserId) ?? null),
    createdAt: access.createdAt,
    updatedBy: (access.updatedByUserId && userNames.get(access.updatedByUserId)) ?? null,
    updatedAt: access.updatedAt,
  };
}
