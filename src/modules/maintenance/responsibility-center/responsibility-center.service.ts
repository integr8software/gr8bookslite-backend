import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma, ResponsibilityCenterStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateResponsibilityCenterDto } from './dto/create-responsibility-center.dto';
import { GetResponsibilityCenterListQueryDto } from './dto/get-responsibility-center-list-query.dto';
import { UpdateResponsibilityCenterStatusDto } from './dto/update-responsibility-center-status.dto';
import { UpdateResponsibilityCenterDto } from './dto/update-responsibility-center.dto';
import { mapResponsibilityCenter } from './mappers/responsibility-center.mapper';
import { ResponsibilityCenterInclude } from './prisma/responsibility-center.include';
import type { ResponsibilityCenterWithRelations } from './types/responsibility-center-with-relations.type';

const ResponsibilityCenterPermissionModuleCode = 'RC';

@Injectable()
export class ResponsibilityCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetResponsibilityCenterListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [centers, total, statistics] = await Promise.all([
      this.prisma.responsibilityCenter.findMany({
        where,
        include: ResponsibilityCenterInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.responsibilityCenter.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      centers: await this.mapCentersWithAuditUsers(centers),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findTree(user: AuthUser, query: GetResponsibilityCenterListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const centers = await this.prisma.responsibilityCenter.findMany({
      where: this.buildListWhere(companyId, query),
      include: ResponsibilityCenterInclude,
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
    });
    const mappedCenters = await this.mapCentersWithAuditUsers(centers);

    return {
      centers: this.buildTree(mappedCenters),
      statistics: await this.getStatistics(companyId),
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const center = await this.findCenterOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      center: (await this.mapCentersWithAuditUsers([center]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateResponsibilityCenterDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.ensureRequiredText(dto.code, 'Code');
    this.ensureRequiredText(dto.name, 'Name');
    await this.ensureCodeAvailable(companyId, dto.code);
    await this.ensureNameAvailable(companyId, dto.name);
    const parentId = dto.parentId ? await this.resolveParentId(companyId, dto.parentId) : null;

    try {
      const center = await this.prisma.responsibilityCenter.create({
        data: {
          companyId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          category: dto.category,
          financialType: dto.financialType,
          manager: dto.manager?.trim() || null,
          parentId,
          status: dto.status ?? ResponsibilityCenterStatus.ACTIVE,
          description: dto.description?.trim() || '',
          createdByUserId: user.id,
        },
        include: ResponsibilityCenterInclude,
      });

      return {
        message: 'Responsibility center created successfully.',
        center: (await this.mapCentersWithAuditUsers([center]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateResponsibilityCenterDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);

    const centerId = parsePositiveBigIntId(id);
    await this.findCenterOrThrow(companyId, centerId);

    if (dto.code !== undefined) {
      this.ensureRequiredText(dto.code, 'Code');
      await this.ensureCodeAvailable(companyId, dto.code, centerId);
    }

    if (dto.name !== undefined) {
      this.ensureRequiredText(dto.name, 'Name');
      await this.ensureNameAvailable(companyId, dto.name, centerId);
    }

    const parentId = dto.parentId === undefined ? undefined : dto.parentId ? await this.resolveParentId(companyId, dto.parentId) : null;

    if (parentId !== undefined) {
      if (parentId === centerId) {
        throw new BadRequestException('A responsibility center cannot be its own parent.');
      }

      await this.ensureNoHierarchyCycle(companyId, centerId, parentId);
    }

    try {
      const center = await this.prisma.responsibilityCenter.update({
        where: { id: centerId },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.financialType !== undefined ? { financialType: dto.financialType } : {}),
          ...(dto.manager !== undefined ? { manager: dto.manager.trim() || null } : {}),
          ...(parentId !== undefined ? { parentId } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || '' } : {}),
          updatedByUserId: user.id,
        },
        include: ResponsibilityCenterInclude,
      });

      return {
        message: 'Responsibility center updated successfully.',
        center: (await this.mapCentersWithAuditUsers([center]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateResponsibilityCenterStatusDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);

    const centerId = parsePositiveBigIntId(id);
    await this.findCenterOrThrow(companyId, centerId);

    const center = await this.prisma.responsibilityCenter.update({
      where: { id: centerId },
      data: {
        status: dto.status,
        updatedByUserId: user.id,
      },
      include: ResponsibilityCenterInclude,
    });

    return {
      message: 'Responsibility center status updated successfully.',
      center: (await this.mapCentersWithAuditUsers([center]))[0],
    };
  }

  private buildListWhere(companyId: number, query: GetResponsibilityCenterListQueryDto): Prisma.ResponsibilityCenterWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.financialType ? { financialType: query.financialType } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { manager: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { parent: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetResponsibilityCenterListQueryDto): Prisma.ResponsibilityCenterOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'code';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.responsibilityCenter
      .groupBy({
        by: ['status', 'category'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      })
      .then((groups) => {
        const statistics = {
          totalCenters: 0,
          activeCenters: 0,
          inactiveCenters: 0,
          departmentCenters: 0,
          branchCenters: 0,
          projectCenters: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalCenters += count;
          if (group.status === ResponsibilityCenterStatus.ACTIVE) statistics.activeCenters += count;
          if (group.status === ResponsibilityCenterStatus.INACTIVE) statistics.inactiveCenters += count;
          if (group.category === 'DEPARTMENT') statistics.departmentCenters += count;
          if (group.category === 'BRANCH') statistics.branchCenters += count;
          if (group.category === 'PROJECT') statistics.projectCenters += count;
        }

        return statistics;
      });
  }

  private async mapCentersWithAuditUsers(centers: ResponsibilityCenterWithRelations[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      centers.flatMap((center) => [center.createdByUserId, center.updatedByUserId]),
    );

    return centers.map((center) => mapResponsibilityCenter(center, userNames));
  }

  private buildTree<TCenter extends { id: string; parentId: string | null }>(centers: TCenter[]) {
    const nodeById = new Map<string, TCenter & { children: TCenter[] }>();

    centers.forEach((center) => {
      nodeById.set(center.id, { ...center, children: [] });
    });

    const roots: Array<TCenter & { children: TCenter[] }> = [];

    nodeById.forEach((node) => {
      const parent = node.parentId ? nodeById.get(node.parentId) : undefined;

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private async findCenterOrThrow(companyId: number, centerId: bigint) {
    const center = await this.prisma.responsibilityCenter.findFirst({
      where: { id: centerId, companyId, deletedAt: null },
      include: ResponsibilityCenterInclude,
    });

    if (!center) {
      throw new NotFoundException('Responsibility center not found.');
    }

    return center;
  }

  private async resolveParentId(companyId: number, parentId: string) {
    const parsedParentId = parsePositiveBigIntId(parentId, 'parentId');
    await this.findCenterOrThrow(companyId, parsedParentId);

    return parsedParentId;
  }

  private async ensureNoHierarchyCycle(companyId: number, centerId: bigint, parentId: bigint | null) {
    let nextParentId = parentId;
    const visitedIds = new Set<string>();

    while (nextParentId) {
      if (nextParentId === centerId || visitedIds.has(nextParentId.toString())) {
        throw new BadRequestException('Parent center creates a circular hierarchy.');
      }

      visitedIds.add(nextParentId.toString());
      const parent = await this.prisma.responsibilityCenter.findFirst({
        where: { id: nextParentId, companyId, deletedAt: null },
        select: { parentId: true },
      });

      nextParentId = parent?.parentId ?? null;
    }
  }

  private async ensureCodeAvailable(companyId: number, code: string, excludedCenterId?: bigint) {
    const normalizedCode = code.trim().toUpperCase();
    const existingCenter = await this.prisma.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedCenterId ? { not: excludedCenterId } : undefined,
        code: { equals: normalizedCode, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingCenter) {
      throw new ConflictException('A responsibility center with this code already exists.');
    }
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedCenterId?: bigint) {
    const normalizedName = name.trim();
    const existingCenter = await this.prisma.responsibilityCenter.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedCenterId ? { not: excludedCenterId } : undefined,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingCenter) {
      throw new ConflictException('A responsibility center with this name already exists.');
    }
  }

  private ensureRequiredText(value: string, label: string) {
    if (!value.trim()) {
      throw new BadRequestException(`${label} is required.`);
    }
  }

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${ResponsibilityCenterPermissionModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage responsibility centers.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${ResponsibilityCenterPermissionModuleCode}:${action}`);
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A responsibility center with this code or name already exists.');
    }
  }
}
