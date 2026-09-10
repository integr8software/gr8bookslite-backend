import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectMaintenance, ProjectMaintenanceStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProjectMaintenanceDto } from './dto/create-project-maintenance.dto';
import { GetProjectMaintenanceListQueryDto } from './dto/get-project-maintenance-list-query.dto';
import { UpdateProjectMaintenanceDto } from './dto/update-project-maintenance.dto';
import { mapProjectMaintenance } from './mappers/project-maintenance.mapper';

const ProjectMaintenanceModuleCode = 'PJM';
const ProjectMaintenancePermissionMessage = 'You do not have permission to manage project records.';

@Injectable()
export class ProjectMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetProjectMaintenanceListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ProjectMaintenanceModuleCode, PermissionAction.VIEW, ProjectMaintenancePermissionMessage);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [projects, total, statistics] = await Promise.all([
      this.prisma.projectMaintenance.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.projectMaintenance.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      projects: await this.mapProjectsWithAuditUsers(projects),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: getModulePermissions(user, companyId, ProjectMaintenanceModuleCode),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ProjectMaintenanceModuleCode, PermissionAction.VIEW, ProjectMaintenancePermissionMessage);
    const project = await this.findProjectOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      project: (await this.mapProjectsWithAuditUsers([project]))[0],
      permissions: getModulePermissions(user, companyId, ProjectMaintenanceModuleCode),
    };
  }

  async getNextCode(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ProjectMaintenanceModuleCode, PermissionAction.CREATE, ProjectMaintenancePermissionMessage);

    return {
      projectCode: await this.generateNextProjectCode(companyId),
    };
  }

  async create(user: AuthUser, dto: CreateProjectMaintenanceDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ProjectMaintenanceModuleCode, PermissionAction.CREATE, ProjectMaintenancePermissionMessage);

    await this.ensureProjectNameAvailable(companyId, dto.projectName);
    const projectCode = await this.generateNextProjectCode(companyId);
    await this.ensureProjectCodeAvailable(companyId, projectCode);

    try {
      const project = await this.prisma.projectMaintenance.create({
        data: {
          companyId,
          ...this.toCreateProjectData(dto, projectCode),
          status: dto.status ?? ProjectMaintenanceStatus.ACTIVE,
          createdByUserId: user.id,
        },
      });

      return {
        message: 'Project created successfully.',
        project: (await this.mapProjectsWithAuditUsers([project]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'A project with this name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateProjectMaintenanceDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ProjectMaintenanceModuleCode, PermissionAction.UPDATE, ProjectMaintenancePermissionMessage);
    const projectId = parsePositiveBigIntId(id);

    await this.findProjectOrThrow(companyId, projectId);

    if (dto.projectName !== undefined) {
      await this.ensureProjectNameAvailable(companyId, dto.projectName, projectId);
    }
    if (dto.projectCode !== undefined) {
      await this.ensureProjectCodeAvailable(companyId, dto.projectCode, projectId);
    }

    try {
      const project = await this.prisma.projectMaintenance.update({
        where: {
          id: projectId,
        },
        data: {
          ...this.toProjectData(dto),
          updatedByUserId: user.id,
        },
      });

      return {
        message: 'Project updated successfully.',
        project: (await this.mapProjectsWithAuditUsers([project]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'A project with this name already exists.');
      throw error;
    }
  }

  private buildListWhere(companyId: number, query: GetProjectMaintenanceListQueryDto): Prisma.ProjectMaintenanceWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { projectCode: { contains: search, mode: 'insensitive' } },
              { projectName: { contains: search, mode: 'insensitive' } },
              { projectDescription: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async mapProjectsWithAuditUsers(projects: ProjectMaintenance[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      projects.flatMap((project) => [project.createdByUserId, project.updatedByUserId]),
    );

    return projects.map((project) => mapProjectMaintenance(project, userNames));
  }

  private buildOrderBy(query: GetProjectMaintenanceListQueryDto): Prisma.ProjectMaintenanceOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'projectName';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.projectMaintenance
      .groupBy({
        by: ['status'],
        where: {
          companyId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      })
      .then((groups) => {
        const statistics = {
          totalProjects: 0,
          activeProjects: 0,
          inactiveProjects: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalProjects += count;
          if (group.status === ProjectMaintenanceStatus.ACTIVE) statistics.activeProjects += count;
          if (group.status === ProjectMaintenanceStatus.INACTIVE) statistics.inactiveProjects += count;
        }

        return statistics;
      });
  }

  private toCreateProjectData(dto: CreateProjectMaintenanceDto, projectCode: string) {
    return {
      projectCode,
      projectName: dto.projectName.trim(),
      type: dto.type,
      projectDescription: dto.description?.trim() ?? '',
    };
  }

  private toProjectData(dto: UpdateProjectMaintenanceDto) {
    return {
      ...(dto.projectCode !== undefined ? { projectCode: dto.projectCode.trim() || null } : {}),
      ...(dto.projectName !== undefined ? { projectName: dto.projectName.trim() } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.description !== undefined ? { projectDescription: dto.description.trim() } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private async findProjectOrThrow(companyId: number, projectId: bigint) {
    const project = await this.prisma.projectMaintenance.findFirst({
      where: {
        id: projectId,
        companyId,
        deletedAt: null,
      },
    });

    if (!project) {
      throw new NotFoundException('Project record not found.');
    }

    return project;
  }

  private async ensureProjectNameAvailable(companyId: number, projectName: string, excludedProjectId?: bigint) {
    const normalizedProjectName = projectName.trim();

    if (!normalizedProjectName) {
      throw new BadRequestException('Project name is required.');
    }

    const existingProject = await this.prisma.projectMaintenance.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedProjectId ? { not: excludedProjectId } : undefined,
        projectName: {
          equals: normalizedProjectName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingProject) {
      throw new ConflictException('A project with this name already exists.');
    }
  }

  private async ensureProjectCodeAvailable(companyId: number, projectCode?: string, excludedProjectId?: bigint) {
    const normalizedProjectCode = projectCode?.trim();

    if (!normalizedProjectCode) {
      return;
    }

    const existingProject = await this.prisma.projectMaintenance.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedProjectId ? { not: excludedProjectId } : undefined,
        projectCode: {
          equals: normalizedProjectCode,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingProject) {
      throw new ConflictException('A project with this code already exists.');
    }
  }

  private async generateNextProjectCode(companyId: number) {
    const year = new Date().getFullYear();
    const prefix = `PRJ-${year}-`;
    const projects = await this.prisma.projectMaintenance.findMany({
      where: {
        companyId,
        projectCode: {
          startsWith: prefix,
        },
      },
      select: {
        projectCode: true,
      },
    });
    const sequencePattern = new RegExp(`^${prefix}(\\d+)$`);
    const highestSequence = projects.reduce((highest, project) => {
      const match = project.projectCode?.match(sequencePattern);
      const sequence = match ? Number(match[1]) : 0;

      return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
    }, 0);

    return `${prefix}${String(highestSequence + 1).padStart(3, '0')}`;
  }
}
