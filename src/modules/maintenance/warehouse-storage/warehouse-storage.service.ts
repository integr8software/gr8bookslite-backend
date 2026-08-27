import { Injectable } from '@nestjs/common';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';

const WarehouseStorageModuleCode = 'WS';
const LegacyWarehouseStorageModuleCode = 'WSL';

@Injectable()
export class WarehouseStorageService {
  findAll(user: AuthUser) {
    return {
      moduleCode: WarehouseStorageModuleCode,
      companyId: user.companyId,
      warehouseStorage: [],
      statistics: {
        totalLocations: 0,
        activeLocations: 0,
        blockedLocations: 0,
        capacityTrackedLocations: 0,
      },
      permissions: {
        canView: this.hasPermission(user, PermissionAction.VIEW),
        canCreate: this.hasPermission(user, PermissionAction.CREATE),
        canUpdate: this.hasPermission(user, PermissionAction.UPDATE),
        canExport: this.hasPermission(user, PermissionAction.EXPORT),
      },
    };
  }

  private hasPermission(user: AuthUser, action: PermissionAction) {
    return (
      user.permissions.includes(`${WarehouseStorageModuleCode}:${action}`) ||
      user.permissions.includes(`${LegacyWarehouseStorageModuleCode}:${action}`)
    );
  }
}
