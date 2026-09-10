import { Injectable } from '@nestjs/common';
import { ItemBasicInfoStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ItemsLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      items: await this.findOptions({ companyId }),
    };
  }

  async findOptions({ companyId }: { companyId: number }) {
    const items = await this.prisma.itemBasicInfo.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ItemBasicInfoStatus.ACTIVE,
      },
      include: {
        category: true,
        unitOfMeasurement: true,
        responsibilityCenter: true,
        pricing: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return items.map((item) => ({
      id: item.id.toString(),
      code: item.code,
      skuCode: item.skuCode ?? '',
      name: item.name,
      barcode: item.barcode ?? '',
      categoryId: item.categoryId.toString(),
      categoryName: item.category.name,
      unitOfMeasurementId: item.unitOfMeasurementId.toString(),
      unitOfMeasurementSymbol: item.unitOfMeasurement.symbol,
      brand: item.brand ?? '',
      model: item.model ?? '',
      externalReferenceCode: item.externalReferenceCode ?? '',
      responsibilityCenterId: item.responsibilityCenterId?.toString() ?? null,
      responsibilityCenterName: item.responsibilityCenter?.name ?? '',
      description: item.description ?? '',
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      status: item.status,
      costPrice: item.pricing ? Number(item.pricing.cost) : 0,
      sellingPrice: item.pricing ? Number(item.pricing.sellingPrice) : 0,
      suggestedPrice: item.pricing ? Number(item.pricing.suggestedPrice) : 0,
      taxTreatment: item.pricing?.taxTreatment ?? null,
    }));
  }
}
