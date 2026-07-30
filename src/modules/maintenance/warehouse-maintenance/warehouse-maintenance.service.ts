import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Prisma,
  TransactionNumberInputMode,
  WarehouseBranchAvailabilityMode,
  WarehouseStatus,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { GetWarehouseListQueryDto } from './dto/get-warehouse-list-query.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { mapWarehouse } from './mappers/warehouse-maintenance.mapper';
import { WarehouseMaintenanceInclude } from './prisma/warehouse-maintenance.include';
import { seedCompanyWarehouseMaintenanceDefaults } from './seed/warehouse-maintenance.seed';
import type { WarehouseMaintenanceWithBranches } from './types/warehouse-maintenance-with-branches.type';
import {
  findTransactionNumberForCompanyBranch,
  generateTransactionNumberForCompanyBranch,
} from '../../system-administration/transaction-number-sequences/transaction-number-sequence.helper';

const WarehouseMaintenanceModuleCode = 'WM';

@Injectable()
export class WarehouseMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetWarehouseListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    await this.ensureDefaultRows(companyId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [warehouses, total, statistics] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        include: WarehouseMaintenanceInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.warehouse.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      warehouses: await this.mapWarehousesWithAuditUsers(warehouses),
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

  async findOptions(user: AuthUser, query: GetWarehouseListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    await this.ensureDefaultRows(companyId);
    const search = query.search?.trim();
    const filters: Prisma.WarehouseWhereInput[] = [];

    if (query.branchUnitId) {
      filters.push({
        OR: [
          { branchAvailabilityMode: WarehouseBranchAvailabilityMode.ALL },
          {
            branchAvailabilityMode: WarehouseBranchAvailabilityMode.SPECIFIC,
            branches: { some: { unitId: query.branchUnitId } },
          },
          {
            branchAvailabilityMode: WarehouseBranchAvailabilityMode.EXCEPT,
            branches: { none: { unitId: query.branchUnitId } },
          },
        ],
      });
    }

    if (search) {
      filters.push({
        OR: [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }],
      });
    }

    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: WarehouseStatus.ACTIVE,
        ...(filters.length > 0 ? { AND: filters } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return {
      warehouses: warehouses.map((warehouse) => ({
        id: warehouse.id.toString(),
        code: warehouse.code,
        name: warehouse.name,
        status: warehouse.status,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    await this.ensureDefaultRows(companyId);

    const warehouse = await this.findWarehouseOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      warehouse: (await this.mapWarehousesWithAuditUsers([warehouse]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateWarehouseDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    await this.ensureDefaultRows(companyId);

    const branchAvailabilityMode = dto.branchAvailabilityMode ?? WarehouseBranchAvailabilityMode.SPECIFIC;
    const branchUnitIds = await this.resolveBranchUnitIds(companyId, dto.branchUnitIds, branchAvailabilityMode);
    const name = dto.name.trim();

    await this.ensureNameAvailable(companyId, name);

    try {
      const warehouse = await this.prisma.$transaction(async (tx) => {
        const code = await this.resolveWarehouseCodeForCreate(tx, {
          branchUnitId: await this.resolveNumberingBranchUnitId(tx, companyId, branchUnitIds),
          companyId,
          requestedCode: dto.code,
        });
        const created = await tx.warehouse.create({
          data: {
            companyId,
            code,
            name,
            managerName: cleanOptional(dto.managerName),
            status: dto.status ?? WarehouseStatus.ACTIVE,
            branchAvailabilityMode,
            address: cleanOptional(dto.address),
            contactNo: cleanOptional(dto.contactNo),
            description: cleanOptional(dto.description),
            createdByUserId: user.id,
            branches: {
              create: branchUnitIds.map((unitId) => ({ unitId })),
            },
          },
        });

        return tx.warehouse.findUniqueOrThrow({
          where: { id: created.id },
          include: WarehouseMaintenanceInclude,
        });
      });

      return {
        message: 'Warehouse created successfully.',
        warehouse: (await this.mapWarehousesWithAuditUsers([warehouse]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateWarehouseDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    await this.ensureDefaultRows(companyId);
    const warehouseId = parsePositiveBigIntId(id);

    const existingWarehouse = await this.findWarehouseOrThrow(companyId, warehouseId);

    if (dto.code !== undefined && dto.code.trim().length === 0) {
      throw new BadRequestException('Warehouse code cannot be empty.');
    }
    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name.trim(), warehouseId);
    }
    if (dto.code !== undefined && dto.code.trim().toUpperCase() !== existingWarehouse.code.toUpperCase()) {
      await this.ensureWarehouseCodeCanBeUpdated(companyId, existingWarehouse, dto.code, warehouseId);
    }
    const branchAvailabilityMode = dto.branchAvailabilityMode ?? existingWarehouse.branchAvailabilityMode;
    const branchUnitIds =
      dto.branchUnitIds === undefined && dto.branchAvailabilityMode === undefined
        ? undefined
        : await this.resolveBranchUnitIds(companyId, dto.branchUnitIds ?? existingWarehouse.branches.map((branch) => branch.unitId), branchAvailabilityMode);

    try {
      const warehouse = await this.prisma.$transaction(async (tx) => {
        if (branchUnitIds) {
          await tx.warehouseBranch.deleteMany({
            where: { warehouseId },
          });
        }

        const updated = await tx.warehouse.update({
          where: { id: warehouseId },
          data: {
            ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.managerName !== undefined ? { managerName: cleanOptional(dto.managerName) } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.branchAvailabilityMode !== undefined ? { branchAvailabilityMode } : {}),
            ...(dto.address !== undefined ? { address: cleanOptional(dto.address) } : {}),
            ...(dto.contactNo !== undefined ? { contactNo: cleanOptional(dto.contactNo) } : {}),
            ...(dto.description !== undefined ? { description: cleanOptional(dto.description) } : {}),
            updatedByUserId: user.id,
            ...(branchUnitIds
              ? {
                  branches: {
                    create: branchUnitIds.map((unitId) => ({ unitId })),
                  },
                }
              : {}),
          },
        });

        return tx.warehouse.findUniqueOrThrow({
          where: { id: updated.id },
          include: WarehouseMaintenanceInclude,
        });
      });

      return {
        message: 'Warehouse updated successfully.',
        warehouse: (await this.mapWarehousesWithAuditUsers([warehouse]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  private buildListWhere(companyId: number, query: GetWarehouseListQueryDto): Prisma.WarehouseWhereInput {
    const search = query.search?.trim();
    const filters: Prisma.WarehouseWhereInput[] = [];

    if (query.branchUnitId) {
      filters.push({
        OR: [
          { branchAvailabilityMode: WarehouseBranchAvailabilityMode.ALL },
          {
            branchAvailabilityMode: WarehouseBranchAvailabilityMode.SPECIFIC,
            branches: {
              some: {
                unitId: query.branchUnitId,
              },
            },
          },
          {
            branchAvailabilityMode: WarehouseBranchAvailabilityMode.EXCEPT,
            branches: {
              none: {
                unitId: query.branchUnitId,
              },
            },
          },
        ],
      });
    }

    if (search) {
      filters.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { managerName: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { contactNo: { contains: search, mode: 'insensitive' } },
          {
            branches: {
              some: {
                unit: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    return {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(filters.length > 0 ? { AND: filters } : {}),
    };
  }

  private buildOrderBy(query: GetWarehouseListQueryDto): Prisma.WarehouseOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.warehouse
      .groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      })
      .then((groups) => {
        const statistics = {
          totalWarehouses: 0,
          activeWarehouses: 0,
          inactiveWarehouses: 0,
        };

        for (const group of groups) {
          const count = group._count._all;
          statistics.totalWarehouses += count;
          if (group.status === WarehouseStatus.ACTIVE) {
            statistics.activeWarehouses += count;
          }
          if (group.status === WarehouseStatus.INACTIVE) {
            statistics.inactiveWarehouses += count;
          }
        }

        return statistics;
      });
  }

  private async mapWarehousesWithAuditUsers(warehouses: WarehouseMaintenanceWithBranches[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      warehouses.flatMap((warehouse) => [warehouse.createdByUserId, warehouse.updatedByUserId]),
    );

    return warehouses.map((warehouse) => mapWarehouse(warehouse, userNames));
  }

  private async ensureDefaultRows(companyId: number) {
    await this.prisma.$transaction((tx) => seedCompanyWarehouseMaintenanceDefaults(tx, companyId));
  }

  private async resolveBranchUnitIds(companyId: number, branchUnitIds: number[] | undefined, branchAvailabilityMode: WarehouseBranchAvailabilityMode) {
    const requestedUnitIds = [...new Set(branchUnitIds ?? [])];

    if (branchAvailabilityMode === WarehouseBranchAvailabilityMode.ALL) {
      return [];
    }

    if (branchAvailabilityMode === WarehouseBranchAvailabilityMode.SPECIFIC && requestedUnitIds.length === 0) {
      throw new BadRequestException('Choose at least one branch for specific warehouse availability.');
    }

    if (requestedUnitIds.length === 0) {
      return [];
    }

    const units = await this.prisma.companyUnit.findMany({
      where: {
        id: { in: requestedUnitIds },
        companyId,
        isActive: true,
      },
      select: { id: true },
    });
    const validUnitIds = new Set(units.map((unit) => unit.id));

    if (units.length !== requestedUnitIds.length || requestedUnitIds.some((unitId) => !validUnitIds.has(unitId))) {
      throw new BadRequestException('Select active branches that belong to the active company.');
    }

    return requestedUnitIds;
  }

  private async resolveNumberingBranchUnitId(tx: Prisma.TransactionClient, companyId: number, branchUnitIds: number[]) {
    const requestedBranchUnitId = branchUnitIds[0];

    if (requestedBranchUnitId) {
      return requestedBranchUnitId;
    }

    const headOffice = await tx.companyUnit.findFirst({
      where: {
        companyId,
        type: CompanyUnitType.HEAD_OFFICE,
        isActive: true,
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (!headOffice) {
      throw new BadRequestException('Create an active head office before adding warehouses.');
    }

    return headOffice.id;
  }

  private async resolveWarehouseCodeForCreate(
    tx: Prisma.TransactionClient,
    {
      branchUnitId,
      companyId,
      requestedCode,
    }: {
      branchUnitId: number;
      companyId: number;
      requestedCode?: string;
    },
  ): Promise<string> {
    const sequence = await findTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      companyId,
      moduleCode: WarehouseMaintenanceModuleCode,
    });

    if (sequence?.inputMode === TransactionNumberInputMode.MANUAL) {
      const normalizedCode = requestedCode?.trim() ?? '';

      if (!normalizedCode) {
        throw new BadRequestException('Warehouse code is required for manual numbering.');
      }

      await this.ensureCodeAvailable(companyId, normalizedCode);
      return normalizedCode;
    }

    const generated = await generateTransactionNumberForCompanyBranch(tx, {
      branchUnitId,
      createDefaultIfMissing: true,
      companyId,
      moduleCode: WarehouseMaintenanceModuleCode,
      isIssued: (transactionNumber) =>
        tx.warehouse
          .findFirst({
            where: {
              companyId,
              code: { equals: transactionNumber, mode: 'insensitive' },
            },
            select: { id: true },
          })
          .then(Boolean),
    });

    return generated.transactionNumber;
  }

  private async ensureWarehouseCodeCanBeUpdated(companyId: number, warehouse: WarehouseMaintenanceWithBranches, requestedCode: string, warehouseId: bigint) {
    const branchUnitId = warehouse.branches[0]?.unitId;

    if (branchUnitId) {
      const sequence = await findTransactionNumberForCompanyBranch(this.prisma, {
        branchUnitId,
        companyId,
        moduleCode: WarehouseMaintenanceModuleCode,
      });

      if (sequence?.inputMode === TransactionNumberInputMode.AUTO) {
        throw new BadRequestException('Warehouse code is auto-generated by Maintenance Registry and cannot be changed manually.');
      }
    }

    await this.ensureCodeAvailable(companyId, requestedCode, warehouseId);
  }

  private async findWarehouseOrThrow(companyId: number, warehouseId: bigint) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        companyId,
        deletedAt: null,
      },
      include: WarehouseMaintenanceInclude,
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    return warehouse;
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedWarehouseId?: bigint) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Warehouse name is required.');
    }

    const existingWarehouse = await this.prisma.warehouse.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedWarehouseId ? { not: excludedWarehouseId } : undefined,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingWarehouse) {
      throw new ConflictException('A warehouse with this name already exists.');
    }
  }

  private async ensureCodeAvailable(companyId: number, code: string, excludedWarehouseId?: bigint) {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      throw new BadRequestException('Warehouse code is required.');
    }

    const existingWarehouse = await this.prisma.warehouse.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedWarehouseId ? { not: excludedWarehouseId } : undefined,
        code: { equals: normalizedCode, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingWarehouse) {
      throw new ConflictException('A warehouse with this code already exists.');
    }
  }

  private async createAvailableWarehouseCode(companyId: number, baseCode: string) {
    const normalizedBaseCode = baseCode.trim().toUpperCase().slice(0, 80);
    let candidate = normalizedBaseCode;
    let suffix = 2;

    if (!candidate) {
      throw new BadRequestException('Warehouse code is required.');
    }

    while (
      await this.prisma.warehouse.findFirst({
        where: {
          companyId,
          deletedAt: null,
          code: { equals: candidate, mode: 'insensitive' },
        },
        select: { id: true },
      })
    ) {
      const suffixText = `-${suffix}`;
      candidate = `${normalizedBaseCode.slice(0, 80 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    return candidate;
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
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
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

    if (user.companyId === companyId && user.permissions.includes(`${WarehouseMaintenanceModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage warehouses.');
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

    return user.companyId === companyId && user.permissions.includes(`${WarehouseMaintenanceModuleCode}:${action}`);
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
      throw new ConflictException('A warehouse with this code or name already exists.');
    }
  }
}
