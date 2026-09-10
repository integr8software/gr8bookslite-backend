import { Injectable } from '@nestjs/common';
import { ProjectMaintenanceStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetProjectMaintenanceListQueryDto } from '../dto/get-project-maintenance-list-query.dto';

@Injectable()
export class ProjectMaintenanceLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: Pick<GetProjectMaintenanceListQueryDto, 'search'>) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      projects: await this.findOptions({
        companyId,
        search: query.search,
      }),
    };
  }

  async findOptions({ companyId, search }: { companyId: number; search?: string }) {
    const normalizedSearch = search?.trim();
    const projects = await this.prisma.projectMaintenance.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ProjectMaintenanceStatus.ACTIVE,
        ...(normalizedSearch
          ? {
              OR: [
                { projectCode: { contains: normalizedSearch, mode: 'insensitive' } },
                { projectName: { contains: normalizedSearch, mode: 'insensitive' } },
                { projectDescription: { contains: normalizedSearch, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        projectCode: true,
        projectName: true,
        type: true,
        projectDescription: true,
        status: true,
      },
      orderBy: [{ projectName: 'asc' }, { id: 'asc' }],
    });

    return projects.map((project) => ({
      id: project.id.toString(),
      projectCode: project.projectCode,
      projectName: project.projectName,
      type: project.type,
      name: project.projectName,
      description: project.projectDescription ?? '',
      status: project.status,
    }));
  }
}
