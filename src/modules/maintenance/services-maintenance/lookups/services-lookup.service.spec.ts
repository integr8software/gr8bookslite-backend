import { ChartAccountStatus, ServiceMaintenanceType } from '@prisma/client';
import { ServicesLookupService } from './services-lookup.service';

describe('ServicesLookupService', () => {
  it('returns searchable active service options with the shared name field', async () => {
    const prisma = { serviceMaintenance: { findMany: jest.fn() } };
    const service = new ServicesLookupService(prisma as never);
    prisma.serviceMaintenance.findMany.mockResolvedValue([
      { id: 14n, serviceName: 'Consulting', serviceType: ServiceMaintenanceType.SALES, status: ChartAccountStatus.ACTIVE },
    ]);

    const result = await service.findOptions({ companyId: 11, search: ' consult ', serviceType: ServiceMaintenanceType.SALES });

    expect(prisma.serviceMaintenance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: ChartAccountStatus.ACTIVE,
          serviceType: ServiceMaintenanceType.SALES,
          serviceName: { contains: 'consult', mode: 'insensitive' },
        },
      }),
    );
    expect(result).toEqual([
      { id: '14', serviceName: 'Consulting', name: 'Consulting', serviceType: ServiceMaintenanceType.SALES, status: ChartAccountStatus.ACTIVE },
    ]);
  });
});
