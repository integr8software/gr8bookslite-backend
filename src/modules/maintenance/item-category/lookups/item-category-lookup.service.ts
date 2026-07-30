import { Injectable } from '@nestjs/common';
import { ItemCategoryStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class ItemCategoryLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      categories: await this.findOptions({ companyId }),
    };
  }

  async findOptions({ companyId }: { companyId: number }) {
    const categories = await this.prisma.itemCategory.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ItemCategoryStatus.ACTIVE,
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        parentId: true,
        behaviors: true,
        allowSubCategory: true,
        status: true,
      },
    });

    return categories.map((category) => ({
      id: category.id.toString(),
      code: category.code,
      name: category.name,
      description: category.description,
      parentId: category.parentId?.toString() ?? null,
      behaviors: category.behaviors,
      allowSubCategory: category.allowSubCategory,
      status: category.status,
    }));
  }
}
