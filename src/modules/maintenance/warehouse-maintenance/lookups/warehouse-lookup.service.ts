import { Injectable } from '@nestjs/common';
import { Prisma, WarehouseBranchAvailabilityMode, WarehouseStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { seedCompanyWarehouseMaintenanceDefaults } from '../seed/warehouse-maintenance.seed';
import { WarehouseLookupQueryDto } from '../dto/warehouse-lookup-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class WarehouseLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: WarehouseLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    await this.ensureDefaultRows(companyId);

    return {
      warehouses: await this.findOptions({
        companyId,
        search: query.search,
        branchUnitId: query.branchUnitId,
      }),
    };
  }

  async findOptions({ companyId, search, branchUnitId }: { companyId: number; search?: string; branchUnitId?: number }) {
    const normalizedSearch = search?.trim();
    const filters: Prisma.WarehouseWhereInput[] = [];

    if (branchUnitId) {
      filters.push({
        OR: [
          { branchAvailabilityMode: WarehouseBranchAvailabilityMode.ALL },
          {
            branchAvailabilityMode: WarehouseBranchAvailabilityMode.SPECIFIC,
            branches: { some: { unitId: branchUnitId } },
          },
          {
            branchAvailabilityMode: WarehouseBranchAvailabilityMode.EXCEPT,
            branches: { none: { unitId: branchUnitId } },
          },
        ],
      });
    }

    if (normalizedSearch) {
      filters.push({
        OR: [{ code: { contains: normalizedSearch, mode: 'insensitive' } }, { name: { contains: normalizedSearch, mode: 'insensitive' } }],
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

    return warehouses.map((warehouse) => ({
      id: warehouse.id.toString(),
      code: warehouse.code,
      name: warehouse.name,
      status: warehouse.status,
    }));
  }

  private async ensureDefaultRows(companyId: number) {
    await this.prisma.$transaction((tx) => seedCompanyWarehouseMaintenanceDefaults(tx, companyId));
  }
}
