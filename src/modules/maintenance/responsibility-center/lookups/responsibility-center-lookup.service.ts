import { Injectable } from '@nestjs/common';
import { ResponsibilityCenterStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../../common/utils/id.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetResponsibilityCenterListQueryDto } from '../dto/get-responsibility-center-list-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class ResponsibilityCenterLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: GetResponsibilityCenterListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      responsibilityCenters: await this.findOptions({
        companyId,
        query,
      }),
    };
  }

  async findOptions({ companyId, query }: { companyId: number; query: GetResponsibilityCenterListQueryDto }) {
    const search = query.search?.trim();
    const responsibilityCenters = await this.prisma.responsibilityCenter.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ResponsibilityCenterStatus.ACTIVE,
        ...(query.typeId ? { typeId: parsePositiveBigIntId(query.typeId, 'typeId') } : {}),
        ...(query.classificationId
          ? {
              type: {
                classificationId: parsePositiveBigIntId(query.classificationId, 'classificationId'),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        type: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
    });

    return responsibilityCenters.map((center) => ({
      id: center.id.toString(),
      code: center.code,
      name: center.name,
      typeName: center.type.name,
      status: center.status,
    }));
  }
}
