import { Injectable } from '@nestjs/common';
import { ItemAttributeStatus as ItemVariationStatus, ItemAttributeValueStatus as ItemVariationValueStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class ItemVariationsLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      variations: await this.findOptions({ companyId }),
    };
  }

  async findOptions({ companyId }: { companyId: number }) {
    const variations = await this.prisma.itemAttribute.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ItemVariationStatus.ACTIVE,
      },
      include: {
        values: {
          where: {
            deletedAt: null,
            status: ItemVariationValueStatus.ACTIVE,
          },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return variations.map((variation) => ({
      id: variation.id.toString(),
      code: variation.code,
      name: variation.name,
      usage: variation.usage,
      requiredOnItem: variation.requiredOnItem,
      affectsStock: variation.affectsStock,
      status: variation.status,
      values: variation.values.map((value) => ({
        id: value.id.toString(),
        label: value.label,
        isUsed: value.isUsed,
        status: value.status,
      })),
    }));
  }
}
