import { PermissionAction } from '../../../common/enums/permission-action.enum';
import { WarehouseStorageService } from './warehouse-storage.service';

describe('WarehouseStorageService permissions', () => {
  function createService() {
    return new WarehouseStorageService();
  }

  it('returns warehouse storage state using current and legacy permissions', () => {
    const service = createService();

    const result = service.findAll({
      companyId: 11,
      permissions: [`WS:${PermissionAction.VIEW}`, `WSL:${PermissionAction.CREATE}`, `WS:${PermissionAction.EXPORT}`],
    } as never);

    expect(result).toEqual({
      moduleCode: 'WS',
      companyId: 11,
      warehouseStorage: [],
      statistics: {
        totalLocations: 0,
        activeLocations: 0,
        blockedLocations: 0,
        capacityTrackedLocations: 0,
      },
      permissions: {
        canView: true,
        canCreate: true,
        canUpdate: false,
        canExport: true,
      },
    });
  });
});
