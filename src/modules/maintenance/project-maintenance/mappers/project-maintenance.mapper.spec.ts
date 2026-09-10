import { ProjectMaintenanceStatus } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import { mapProjectMaintenance } from './project-maintenance.mapper';

describe('mapProjectMaintenance', () => {
  it('normalizes nullable display fields and audit names', () => {
    const createdAt = new Date('2026-09-01T00:00:00.000Z');
    const updatedAt = new Date('2026-09-02T00:00:00.000Z');

    const result = mapProjectMaintenance(
      {
        id: 42n,
        projectCode: null,
        projectName: 'Customer Portal',
        projectDescription: null,
        status: ProjectMaintenanceStatus.ACTIVE,
        createdByUserId: null,
        createdAt,
        updatedByUserId: 9,
        updatedAt,
      } as never,
      new Map([[9, 'Bay']]),
    );

    expect(result).toEqual({
      id: '42',
      projectCode: '',
      projectName: 'Customer Portal',
      description: '',
      status: ProjectMaintenanceStatus.ACTIVE,
      createdBy: SystemGeneratedAuditLabel,
      createdAt,
      updatedBy: 'Bay',
      updatedAt,
    });
  });
});
