import { Injectable } from '@nestjs/common';
import { UnitOfMeasurementStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UnitOfMeasurementLookupQueryDto } from '../dto/unit-of-measurement-lookup-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class UnitOfMeasurementLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: UnitOfMeasurementLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      units: await this.findOptions({
        companyId,
        search: query.search,
        quantityMode: query.quantityMode,
      }),
    };
  }

  async findOptions({
    companyId,
    search,
    quantityMode,
  }: {
    companyId: number;
    search?: string;
    quantityMode?: UnitOfMeasurementLookupQueryDto['quantityMode'];
  }) {
    const normalizedSearch = search?.trim();
    const units = await this.prisma.unitOfMeasurement.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: UnitOfMeasurementStatus.ACTIVE,
        ...(quantityMode ? { quantityMode } : {}),
        ...(normalizedSearch
          ? {
              OR: [{ name: { contains: normalizedSearch, mode: 'insensitive' } }, { symbol: { contains: normalizedSearch, mode: 'insensitive' } }],
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

    return units.map((unit) => ({
      id: unit.id.toString(),
      name: unit.name,
      symbol: unit.symbol,
      quantityMode: unit.quantityMode,
      status: unit.status,
    }));
  }
}
