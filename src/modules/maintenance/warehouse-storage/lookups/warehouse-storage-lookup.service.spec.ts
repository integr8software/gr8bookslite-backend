import { WarehouseStorageLookupService } from './warehouse-storage-lookup.service';

describe('WarehouseStorageLookupService', () => {
  it('returns an empty company-scoped lookup until storage options are implemented', () => {
    const service = new WarehouseStorageLookupService();

    expect(service.findOptionsForCompanyUser({ companyId: 11 } as never)).toEqual({
      companyId: 11,
      warehouseStorage: [],
    });
  });
});
