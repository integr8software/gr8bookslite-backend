import { ProjectMaintenanceStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { ProjectMaintenanceService } from './project-maintenance.service';

describe('ProjectMaintenanceService', () => {
  it('builds searchable paginated project lists with statistics', async () => {
    const project = {
      id: 20n,
      projectCode: 'PRJ-001',
      projectName: 'Customer Portal',
      projectDescription: 'Frontend refresh',
      status: ProjectMaintenanceStatus.ACTIVE,
      createdByUserId: 1,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedByUserId: null,
      updatedAt: null,
    };
    const prisma = {
      projectMaintenance: {
        findMany: jest.fn().mockResolvedValue([project]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([{ status: ProjectMaintenanceStatus.ACTIVE, _count: { _all: 1 } }]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Bay' }]),
      },
    };
    const service = new ProjectMaintenanceService(prisma as never);

    const result = await service.findAll({ companyId: 11, id: 1, role: AppRole.SUPER_ADMIN, permissions: [] } as never, {
      search: ' portal ',
      page: 2,
      limit: 5,
      sortBy: 'projectCode',
      sortDirection: 'desc',
    });

    expect(prisma.projectMaintenance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          OR: [
            { projectCode: { contains: 'portal', mode: 'insensitive' } },
            { projectName: { contains: 'portal', mode: 'insensitive' } },
            { projectDescription: { contains: 'portal', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ projectCode: 'desc' }, { id: 'asc' }],
        skip: 5,
        take: 5,
      }),
    );
    expect(result.statistics).toEqual({ totalProjects: 1, activeProjects: 1, inactiveProjects: 0 });
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(result.projects[0]).toEqual(expect.objectContaining({ id: '20', projectCode: 'PRJ-001', createdBy: 'Bay' }));
  });
});
