import { ProjectMaintenanceStatus } from '@prisma/client';
import { ProjectMaintenanceLookupService } from './project-maintenance-lookup.service';

describe('ProjectMaintenanceLookupService', () => {
  it('returns searchable active project options with project code and shared name field', async () => {
    const prisma = { projectMaintenance: { findMany: jest.fn() } };
    const service = new ProjectMaintenanceLookupService(prisma as never);
    prisma.projectMaintenance.findMany.mockResolvedValue([
      {
        id: 20n,
        projectCode: 'PRJ-001',
        projectName: 'Website Revamp',
        projectDescription: 'Customer portal refresh',
        status: ProjectMaintenanceStatus.ACTIVE,
      },
    ]);

    const result = await service.findOptions({ companyId: 11, search: ' revamp ' });

    expect(prisma.projectMaintenance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          status: ProjectMaintenanceStatus.ACTIVE,
          OR: [
            { projectCode: { contains: 'revamp', mode: 'insensitive' } },
            { projectName: { contains: 'revamp', mode: 'insensitive' } },
            { projectDescription: { contains: 'revamp', mode: 'insensitive' } },
          ],
        },
      }),
    );
    expect(result).toEqual([
      {
        id: '20',
        projectCode: 'PRJ-001',
        projectName: 'Website Revamp',
        name: 'Website Revamp',
        description: 'Customer portal refresh',
        status: ProjectMaintenanceStatus.ACTIVE,
      },
    ]);
  });
});
