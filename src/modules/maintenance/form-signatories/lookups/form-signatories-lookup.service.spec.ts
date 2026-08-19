import { FormSignatoriesLookupService } from './form-signatories-lookup.service';

describe('FormSignatoriesLookupService', () => {
  it('caches company options and returns sorted modules with mapped branches', async () => {
    const prisma = {
      companyUnit: { findMany: jest.fn().mockResolvedValue([{ id: 2, companyId: 11, code: 'HQ', name: 'Head Office', type: 'HEAD_OFFICE' }]) },
    };
    const cacheManager = {
      wrap: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    };
    const entitlementService = {
      getCompanyAllowedModules: jest.fn().mockResolvedValue([
        { id: 2, code: 'Z', name: 'Sales' },
        { id: 1, code: 'A', name: 'Accounting' },
      ]),
    };
    const service = new FormSignatoriesLookupService(prisma as never, cacheManager as never, entitlementService as never);

    const result = await service.findOptionsForCompany(11);

    expect(cacheManager.wrap).toHaveBeenCalledWith('form-signatories:options:11', expect.any(Function), 60_000);
    expect(result).toEqual({
      branches: [{ id: 2, companyId: 11, code: 'HQ', name: 'Head Office', displayName: 'Head Office', type: 'HEAD_OFFICE' }],
      modules: [
        { id: 1, code: 'A', name: 'Accounting' },
        { id: 2, code: 'Z', name: 'Sales' },
      ],
    });
  });
});
