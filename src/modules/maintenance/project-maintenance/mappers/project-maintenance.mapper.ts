import type { ProjectMaintenance } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';

export function mapProjectMaintenance(project: ProjectMaintenance, userNames: Map<number, string>) {
  return {
    id: project.id.toString(),
    projectCode: project.projectCode ?? '',
    projectName: project.projectName,
    description: project.projectDescription ?? '',
    status: project.status,
    createdBy: project.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(project.createdByUserId) ?? null),
    createdAt: project.createdAt,
    updatedBy: (project.updatedByUserId && userNames.get(project.updatedByUserId)) ?? null,
    updatedAt: project.updatedAt,
  };
}
