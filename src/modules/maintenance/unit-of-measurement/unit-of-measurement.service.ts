import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma, UnitOfMeasurement, UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUnitOfMeasurementDto } from './dto/create-unit-of-measurement.dto';
import { GetUnitOfMeasurementListQueryDto } from './dto/get-unit-of-measurement-list-query.dto';
import { ImportUnitOfMeasurementsDto } from './dto/import-unit-of-measurements.dto';
import { UpdateUnitOfMeasurementDto } from './dto/update-unit-of-measurement.dto';
import { mapUnitOfMeasurement } from './mappers/unit-of-measurement.mapper';

const UnitOfMeasurementModuleCode = 'UOM';

@Injectable()
export class UnitOfMeasurementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetUnitOfMeasurementListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [units, total, statistics] = await Promise.all([
      this.prisma.unitOfMeasurement.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.unitOfMeasurement.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      units: await this.mapUnitsWithAuditUsers(units),
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

  async findOptions(user: AuthUser, query: GetUnitOfMeasurementListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const search = query.search?.trim();

    const units = await this.prisma.unitOfMeasurement.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: UnitOfMeasurementStatus.ACTIVE,
        ...(query.quantityMode ? { quantityMode: query.quantityMode } : {}),
        ...(search
          ? {
              OR: [{ name: { contains: search, mode: 'insensitive' } }, { symbol: { contains: search, mode: 'insensitive' } }],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        symbol: true,
        quantityMode: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return {
      units: units.map((unit) => ({
        id: unit.id.toString(),
        name: unit.name,
        symbol: unit.symbol,
        quantityMode: unit.quantityMode,
        status: unit.status,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const unit = await this.findUnitOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      unit: (await this.mapUnitsWithAuditUsers([unit]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateUnitOfMeasurementDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    await this.ensureNameAvailable(companyId, dto.name);
    await this.ensureSymbolAvailable(companyId, dto.symbol);

    try {
      const unit = await this.prisma.unitOfMeasurement.create({
        data: {
          companyId,
          ...this.toCreateUnitData(dto),
          status: dto.status ?? UnitOfMeasurementStatus.ACTIVE,
          createdByUserId: user.id,
        },
      });

      return {
        message: 'Unit of measurement created successfully.',
        unit: (await this.mapUnitsWithAuditUsers([unit]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateUnitOfMeasurementDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const unitId = parsePositiveBigIntId(id);

    await this.findUnitOrThrow(companyId, unitId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, unitId);
    }
    if (dto.symbol !== undefined) {
      await this.ensureSymbolAvailable(companyId, dto.symbol, unitId);
    }

    try {
      const unit = await this.prisma.unitOfMeasurement.update({
        where: {
          id: unitId,
        },
        data: {
          ...this.toUnitData(dto),
          updatedByUserId: user.id,
        },
      });

      return {
        message: 'Unit of measurement updated successfully.',
        unit: (await this.mapUnitsWithAuditUsers([unit]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async importUnits(user: AuthUser, dto: ImportUnitOfMeasurementsDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.ensureNoDuplicateImportValues(dto.units);

    const names = dto.units.map((unit) => unit.name.trim());
    const symbols = dto.units.map((unit) => this.normalizeSymbol(unit.symbol));
    const existingUnits = await this.prisma.unitOfMeasurement.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ name: { in: names, mode: 'insensitive' } }, { symbol: { in: symbols, mode: 'insensitive' } }],
      },
      select: {
        name: true,
        symbol: true,
      },
    });

    if (existingUnits.length > 0) {
      const existingUnit = existingUnits[0];
      throw new ConflictException(`Unit of measurement already exists: ${existingUnit.name} (${existingUnit.symbol}).`);
    }

    const units = await this.prisma.$transaction(async (tx) => {
      await tx.unitOfMeasurement.createMany({
        data: dto.units.map((unit) => ({
          companyId,
          ...this.toCreateUnitData(unit),
          status: unit.status ?? UnitOfMeasurementStatus.ACTIVE,
          createdByUserId: user.id,
        })),
      });

      return tx.unitOfMeasurement.findMany({
        where: {
          companyId,
          symbol: {
            in: symbols,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
        orderBy: [{ name: 'asc' }],
      });
    });

    return {
      message: `${units.length} unit${units.length === 1 ? '' : 's'} imported successfully.`,
      units: await this.mapUnitsWithAuditUsers(units),
    };
  }

  private buildListWhere(companyId: number, query: GetUnitOfMeasurementListQueryDto): Prisma.UnitOfMeasurementWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.quantityMode ? { quantityMode: query.quantityMode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [{ name: { contains: search, mode: 'insensitive' } }, { symbol: { contains: search, mode: 'insensitive' } }],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetUnitOfMeasurementListQueryDto): Prisma.UnitOfMeasurementOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.unitOfMeasurement
      .groupBy({
        by: ['status', 'quantityMode'],
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
          totalUnits: 0,
          activeUnits: 0,
          inactiveUnits: 0,
          decimalUnits: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalUnits += count;
          if (group.status === UnitOfMeasurementStatus.ACTIVE) statistics.activeUnits += count;
          if (group.status === UnitOfMeasurementStatus.INACTIVE) statistics.inactiveUnits += count;
          if (group.quantityMode === UnitOfMeasurementQuantityMode.FLOAT) statistics.decimalUnits += count;
        }

        return statistics;
      });
  }

  private async mapUnitsWithAuditUsers(units: UnitOfMeasurement[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      units.flatMap((unit) => [unit.createdByUserId, unit.updatedByUserId]),
    );

    return units.map((unit) => mapUnitOfMeasurement(unit, userNames));
  }

  private toCreateUnitData(dto: CreateUnitOfMeasurementDto) {
    return {
      name: this.normalizeName(dto.name),
      symbol: this.normalizeSymbol(dto.symbol),
      quantityMode: dto.quantityMode,
    };
  }

  private toUnitData(dto: UpdateUnitOfMeasurementDto) {
    return {
      ...(dto.name !== undefined ? { name: this.normalizeName(dto.name) } : {}),
      ...(dto.symbol !== undefined ? { symbol: this.normalizeSymbol(dto.symbol) } : {}),
      ...(dto.quantityMode !== undefined ? { quantityMode: dto.quantityMode } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private async findUnitOrThrow(companyId: number, unitId: bigint) {
    const unit = await this.prisma.unitOfMeasurement.findFirst({
      where: {
        id: unitId,
        companyId,
        deletedAt: null,
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit of measurement not found.');
    }

    return unit;
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedUnitId?: bigint) {
    const normalizedName = this.normalizeName(name);

    if (!normalizedName) {
      throw new BadRequestException('Unit of measurement name is required.');
    }

    const existingUnit = await this.prisma.unitOfMeasurement.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedUnitId ? { not: excludedUnitId } : undefined,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUnit) {
      throw new ConflictException('A unit of measurement with this name already exists.');
    }
  }

  private async ensureSymbolAvailable(companyId: number, symbol: string, excludedUnitId?: bigint) {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    if (!normalizedSymbol) {
      throw new BadRequestException('Unit of measurement symbol is required.');
    }

    const existingUnit = await this.prisma.unitOfMeasurement.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedUnitId ? { not: excludedUnitId } : undefined,
        symbol: {
          equals: normalizedSymbol,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUnit) {
      throw new ConflictException('A unit of measurement with this symbol already exists.');
    }
  }

  private ensureNoDuplicateImportValues(units: CreateUnitOfMeasurementDto[]) {
    const names = new Set<string>();
    const symbols = new Set<string>();

    for (const unit of units) {
      const normalizedName = this.normalizeName(unit.name).toLowerCase();
      const normalizedSymbol = this.normalizeSymbol(unit.symbol).toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(`Duplicate unit of measurement in upload: ${unit.name.trim()}.`);
      }
      if (symbols.has(normalizedSymbol)) {
        throw new BadRequestException(`Duplicate unit of measurement symbol in upload: ${this.normalizeSymbol(unit.symbol)}.`);
      }

      names.add(normalizedName);
      symbols.add(normalizedSymbol);
    }
  }

  private normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeSymbol(symbol: string) {
    return symbol.trim().replace(/\s+/g, '').toUpperCase();
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
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${UnitOfMeasurementModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage units of measurement.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
      canImport: this.can(user, companyId, PermissionAction.CREATE),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${UnitOfMeasurementModuleCode}:${action}`);
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
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : '';
      if (target.includes('symbol')) {
        throw new ConflictException('A unit of measurement with this symbol already exists.');
      }
      throw new ConflictException('A unit of measurement with this name already exists.');
    }
  }
}
