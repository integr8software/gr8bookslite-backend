import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UnitOfMeasurement, UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
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

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { normalizeWhitespace } from '../../../common/utils/string-normalization.util';
const UnitOfMeasurementModuleCode = 'UOM';

@Injectable()
export class UnitOfMeasurementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetUnitOfMeasurementListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, UnitOfMeasurementModuleCode, PermissionAction.VIEW, 'You do not have permission to manage units of measurement.');

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
      permissions: getModulePermissions(user, companyId, UnitOfMeasurementModuleCode, { includeImport: true }),
    };
  }

  async findOptions(user: AuthUser, query: GetUnitOfMeasurementListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
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
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, UnitOfMeasurementModuleCode, PermissionAction.VIEW, 'You do not have permission to manage units of measurement.');
    const unit = await this.findUnitOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      unit: (await this.mapUnitsWithAuditUsers([unit]))[0],
      permissions: getModulePermissions(user, companyId, UnitOfMeasurementModuleCode, { includeImport: true }),
    };
  }

  async create(user: AuthUser, dto: CreateUnitOfMeasurementDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, UnitOfMeasurementModuleCode, PermissionAction.CREATE, 'You do not have permission to manage units of measurement.');

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
      throwConflictOnPrismaUniqueError(error, 'A unit of measurement with this name or symbol already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateUnitOfMeasurementDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, UnitOfMeasurementModuleCode, PermissionAction.UPDATE, 'You do not have permission to manage units of measurement.');
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
      throwConflictOnPrismaUniqueError(error, 'A unit of measurement with this name or symbol already exists.');
      throw error;
    }
  }

  async importUnits(user: AuthUser, dto: ImportUnitOfMeasurementsDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, UnitOfMeasurementModuleCode, PermissionAction.CREATE, 'You do not have permission to manage units of measurement.');
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
      name: normalizeWhitespace(dto.name),
      symbol: this.normalizeSymbol(dto.symbol),
      quantityMode: dto.quantityMode,
    };
  }

  private toUnitData(dto: UpdateUnitOfMeasurementDto) {
    return {
      ...(dto.name !== undefined ? { name: normalizeWhitespace(dto.name) } : {}),
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
    const normalizedName = normalizeWhitespace(name);

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
      const normalizedName = normalizeWhitespace(unit.name).toLowerCase();
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

  private normalizeSymbol(symbol: string) {
    return symbol.trim().replace(/\s+/g, '').toUpperCase();
  }
}
