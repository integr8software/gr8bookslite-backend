import { ChartAccountStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { ServicesMaintenanceService } from './services-maintenance.service';

describe('ServicesMaintenanceService service options', () => {
  function createService() {
    const prisma = {
      serviceMaintenance: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new ServicesMaintenanceService(prisma as never) };
  }

  it('returns active services using the backend service name', async () => {
    const { prisma, service } = createService();
    prisma.serviceMaintenance.findMany.mockResolvedValue([
      { id: 18n, serviceName: 'Equipment Installation', status: ChartAccountStatus.ACTIVE },
    ]);

    const result = await service.findOptions(
      { companyId: 11, role: AppRole.SUPER_ADMIN } as never,
      { search: ' installation ' },
    );

    expect(prisma.serviceMaintenance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: ChartAccountStatus.ACTIVE,
          serviceName: { contains: 'installation', mode: 'insensitive' },
        },
      }),
    );
    expect(result).toEqual({
      services: [
        {
          id: '18',
          serviceName: 'Equipment Installation',
          name: 'Equipment Installation',
          status: ChartAccountStatus.ACTIVE,
        },
      ],
    });
  });
});
