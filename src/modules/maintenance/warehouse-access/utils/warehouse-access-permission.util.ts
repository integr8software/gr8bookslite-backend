import { WarehouseAccessLevel, WarehouseAccessPermission } from '@prisma/client';

export const ManagerWarehouseAccessPermissions = [
  WarehouseAccessPermission.VIEW_STOCK,
  WarehouseAccessPermission.RECEIVE_STOCK,
  WarehouseAccessPermission.ISSUE_STOCK,
  WarehouseAccessPermission.TRANSFER_STOCK,
  WarehouseAccessPermission.ADJUST_STOCK,
  WarehouseAccessPermission.MANAGE_LOCATIONS,
  WarehouseAccessPermission.VIEW_HISTORY,
] as const;

const PickerWarehouseAccessPermissions: WarehouseAccessPermission[] = [
  WarehouseAccessPermission.ISSUE_STOCK,
  WarehouseAccessPermission.TRANSFER_STOCK,
  WarehouseAccessPermission.RECEIVE_STOCK,
];

export function deriveWarehouseAccessLevel(permissions: WarehouseAccessPermission[]) {
  if (ManagerWarehouseAccessPermissions.every((permission) => permissions.includes(permission))) {
    return WarehouseAccessLevel.MANAGER;
  }

  if (permissions.some((permission) => PickerWarehouseAccessPermissions.includes(permission))) {
    return WarehouseAccessLevel.PICKER;
  }

  return WarehouseAccessLevel.VIEWER;
}

export function normalizeWarehouseAccessPermissions(accessLevel: WarehouseAccessLevel | undefined, permissions: WarehouseAccessPermission[]) {
  if (accessLevel === WarehouseAccessLevel.MANAGER) {
    return [...ManagerWarehouseAccessPermissions];
  }

  return [...new Set(permissions)];
}
