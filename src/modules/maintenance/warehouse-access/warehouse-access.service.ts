import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessScopeLevel, MembershipRole, MembershipStatus, Prisma, UserStatus, WarehouseAccessLevel, WarehouseAccessStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateWarehouseAccessDto } from './dto/create-warehouse-access.dto';
import { GetWarehouseAccessDirectoryQueryDto } from './dto/get-warehouse-access-directory-query.dto';
import { GetWarehouseAccessListQueryDto } from './dto/get-warehouse-access-list-query.dto';
import { UpdateWarehouseAccessDto } from './dto/update-warehouse-access.dto';
import { mapWarehouseAccess } from './mappers/warehouse-access.mapper';
import { WarehouseAccessInclude } from './prisma/warehouse-access.include';
import type { WarehouseAccessWithRelations } from './types/warehouse-access-with-relations.type';
import { deriveWarehouseAccessLevel, normalizeWarehouseAccessPermissions } from './utils/warehouse-access-permission.util';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
const WarehouseAccessModuleCode = 'WA';

@Injectable()
export class WarehouseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetWarehouseAccessListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [warehouseAccess, total, statistics] = await Promise.all([
      this.prisma.warehouseAccess.findMany({
        where,
        include: WarehouseAccessInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.warehouseAccess.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      warehouseAccess: await this.mapWarehouseAccessWithAuditUsers(warehouseAccess),
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

  async findDirectoryUsers(user: AuthUser, query: GetWarehouseAccessDirectoryQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const search = query.search?.trim();
    const [memberships, branches] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          companyId,
          status: MembershipStatus.ACTIVE,
          user: {
            status: UserStatus.ACTIVE,
            ...(search
              ? {
                  OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }],
                }
              : {}),
          },
          ...(query.branchUnitId
            ? {
                OR: [
                  { accessScope: AccessScopeLevel.COMPANY },
                  {
                    unitAccess: {
                      some: {
                        unitId: query.branchUnitId,
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          companyRole: {
            select: {
              id: true,
              name: true,
            },
          },
          unitAccess: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              unit: {
                name: 'asc',
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              contactNumber: true,
              status: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      }),
      this.prisma.companyUnit.findMany({
        where: {
          companyId,
          isActive: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const branchById = new Map(branches.map((branch) => [branch.id, branch.name]));

    return {
      users: memberships.map((membership) => {
        const branchUnitIds =
          membership.accessScope === AccessScopeLevel.COMPANY ? branches.map((branch) => branch.id) : membership.unitAccess.map((access) => access.unitId);

        return {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          contactNumber: membership.user.contactNumber,
          status: membership.user.status,
          branchUnitIds,
          branchNames: branchUnitIds.map((unitId) => branchById.get(unitId)).filter((branchName): branchName is string => Boolean(branchName)),
          companyRoleId: membership.companyRoleId,
          companyRoleName: membership.companyRole?.name ?? null,
        };
      }),
      branches: branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const access = await this.findWarehouseAccessOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      warehouseAccess: (await this.mapWarehouseAccessWithAuditUsers([access]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateWarehouseAccessDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.ensureNoDuplicateAssignments(dto);

    const warehouseIds = dto.assignments.map((assignment) => parsePositiveBigIntId(assignment.warehouseId, 'warehouseId'));
    const userIds = [...new Set(dto.assignments.map((assignment) => assignment.userId))];
    await Promise.all([this.ensureWarehousesExist(companyId, warehouseIds), this.ensureUsersBelongToCompany(companyId, userIds)]);
    await this.ensureAssignmentsAvailable(companyId, dto, warehouseIds);

    try {
      const warehouseAccess = await this.prisma.$transaction(async (tx) => {
        await tx.warehouseAccess.createMany({
          data: dto.assignments.map((assignment, index) => {
            const permissions = normalizeWarehouseAccessPermissions(assignment.accessLevel, assignment.permissions);

            return {
              accessLevel: assignment.accessLevel ?? deriveWarehouseAccessLevel(permissions),
              companyId,
              createdByUserId: user.id,
              permissions,
              status: assignment.status ?? WarehouseAccessStatus.ACTIVE,
              userId: assignment.userId,
              warehouseId: warehouseIds[index],
            };
          }),
        });

        return tx.warehouseAccess.findMany({
          where: {
            companyId,
            OR: dto.assignments.map((assignment, index) => ({
              userId: assignment.userId,
              warehouseId: warehouseIds[index],
            })),
          },
          include: WarehouseAccessInclude,
          orderBy: [{ warehouse: { name: 'asc' } }, { user: { name: 'asc' } }],
        });
      });

      return {
        message: `${warehouseAccess.length} warehouse access assignment${warehouseAccess.length === 1 ? '' : 's'} created successfully.`,
        warehouseAccess: await this.mapWarehouseAccessWithAuditUsers(warehouseAccess),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateWarehouseAccessDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const accessId = parsePositiveBigIntId(id);

    await this.findWarehouseAccessOrThrow(companyId, accessId);

    const permissions = dto.permissions ? normalizeWarehouseAccessPermissions(dto.accessLevel, dto.permissions) : undefined;

    try {
      const access = await this.prisma.warehouseAccess.update({
        where: {
          id: accessId,
        },
        data: {
          ...(permissions ? { permissions } : {}),
          ...(dto.accessLevel !== undefined || permissions ? { accessLevel: dto.accessLevel ?? deriveWarehouseAccessLevel(permissions ?? []) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          updatedByUserId: user.id,
        },
        include: WarehouseAccessInclude,
      });

      return {
        message: 'Warehouse access updated successfully.',
        warehouseAccess: (await this.mapWarehouseAccessWithAuditUsers([access]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async revoke(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CANCEL);
    const accessId = parsePositiveBigIntId(id);
    const access = await this.findWarehouseAccessOrThrow(companyId, accessId);

    await this.prisma.warehouseAccess.delete({
      where: {
        id: access.id,
      },
    });

    return {
      message: 'Warehouse access revoked successfully.',
      warehouseAccess: (await this.mapWarehouseAccessWithAuditUsers([access]))[0],
    };
  }

  private buildListWhere(companyId: number, query: GetWarehouseAccessListQueryDto): Prisma.WarehouseAccessWhereInput {
    const search = query.search?.trim();
    const filters: Prisma.WarehouseAccessWhereInput[] = [];

    if (query.warehouseId) {
      filters.push({ warehouseId: parsePositiveBigIntId(query.warehouseId, 'warehouseId') });
    }

    if (query.branchUnitId) {
      filters.push({
        warehouse: {
          branches: {
            some: {
              unitId: query.branchUnitId,
            },
          },
        },
      });
    }

    if (search) {
      filters.push({
        OR: [
          { warehouse: { code: { contains: search, mode: 'insensitive' } } },
          { warehouse: { name: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    return {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.permission ? { permissions: { has: query.permission } } : {}),
      ...(filters.length > 0 ? { AND: filters } : {}),
    };
  }

  private buildOrderBy(query: GetWarehouseAccessListQueryDto): Prisma.WarehouseAccessOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'warehouse';
    const sortDirection = query.sortDirection ?? 'asc';

    if (sortBy === 'warehouse') {
      return [{ warehouse: { name: sortDirection } }, { id: 'asc' }];
    }

    if (sortBy === 'user') {
      return [{ user: { name: sortDirection } }, { id: 'asc' }];
    }

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.warehouseAccess
      .groupBy({
        by: ['status', 'accessLevel'],
        where: {
          companyId,
        },
        _count: {
          _all: true,
        },
      })
      .then((groups) => {
        const statistics = {
          totalAssignments: 0,
          activeAssignments: 0,
          inactiveAssignments: 0,
          managerAssignments: 0,
          pickerAssignments: 0,
          viewerAssignments: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalAssignments += count;
          if (group.status === WarehouseAccessStatus.ACTIVE) statistics.activeAssignments += count;
          if (group.status === WarehouseAccessStatus.INACTIVE) statistics.inactiveAssignments += count;
          if (group.accessLevel === WarehouseAccessLevel.MANAGER) statistics.managerAssignments += count;
          if (group.accessLevel === WarehouseAccessLevel.PICKER) statistics.pickerAssignments += count;
          if (group.accessLevel === WarehouseAccessLevel.VIEWER) statistics.viewerAssignments += count;
        }

        return statistics;
      });
  }

  private async mapWarehouseAccessWithAuditUsers(records: WarehouseAccessWithRelations[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      records.flatMap((access) => [access.createdByUserId, access.updatedByUserId]),
    );

    return records.map((access) => mapWarehouseAccess(access, userNames));
  }

  private ensureNoDuplicateAssignments(dto: CreateWarehouseAccessDto) {
    const keys = new Set<string>();

    for (const assignment of dto.assignments) {
      const key = `${assignment.warehouseId}:${assignment.userId}`;

      if (keys.has(key)) {
        throw new BadRequestException('Duplicate warehouse access assignment in request.');
      }

      keys.add(key);
    }
  }

  private async ensureAssignmentsAvailable(companyId: number, dto: CreateWarehouseAccessDto, warehouseIds: bigint[]) {
    const existingAssignments = await this.prisma.warehouseAccess.findMany({
      where: {
        companyId,
        OR: dto.assignments.map((assignment, index) => ({
          userId: assignment.userId,
          warehouseId: warehouseIds[index],
        })),
      },
      include: WarehouseAccessInclude,
      take: 1,
    });

    if (existingAssignments.length > 0) {
      const existing = existingAssignments[0];

      throw new ConflictException(`${existing.user.name} already has access to ${existing.warehouse.name}.`);
    }
  }

  private async ensureWarehousesExist(companyId: number, warehouseIds: bigint[]) {
    const uniqueWarehouseIds = [...new Set(warehouseIds)];
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        id: {
          in: uniqueWarehouseIds,
        },
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (warehouses.length !== uniqueWarehouseIds.length) {
      throw new BadRequestException('Select warehouses that belong to the active company.');
    }
  }

  private async ensureUsersBelongToCompany(companyId: number, userIds: number[]) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        companyId,
        userId: {
          in: userIds,
        },
        status: MembershipStatus.ACTIVE,
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        userId: true,
      },
    });

    if (memberships.length !== userIds.length) {
      throw new BadRequestException('Select active users that belong to the active company.');
    }
  }

  private async findWarehouseAccessOrThrow(companyId: number, accessId: bigint) {
    const access = await this.prisma.warehouseAccess.findFirst({
      where: {
        id: accessId,
        companyId,
      },
      include: WarehouseAccessInclude,
    });

    if (!access) {
      throw new NotFoundException('Warehouse access assignment not found.');
    }

    return access;
  }



  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${WarehouseAccessModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage warehouse access.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canDelete: this.can(user, companyId, PermissionAction.CANCEL),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${WarehouseAccessModuleCode}:${action}`);
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
      throw new ConflictException('This user already has access to the selected warehouse.');
    }
  }
}
