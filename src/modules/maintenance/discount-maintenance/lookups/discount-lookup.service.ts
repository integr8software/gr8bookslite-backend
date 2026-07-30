import { Injectable } from '@nestjs/common';
import { DiscountStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DiscountLookupQueryDto } from '../dto/discount-lookup-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class DiscountLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: DiscountLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      discounts: await this.findOptions({
        companyId,
        search: query.search,
        type: query.type,
        valueType: query.valueType,
      }),
    };
  }

  async findOptions({
    companyId,
    search,
    type,
    valueType,
  }: {
    companyId: number;
    search?: string;
    type?: DiscountLookupQueryDto['type'];
    valueType?: DiscountLookupQueryDto['valueType'];
  }) {
    const normalizedSearch = search?.trim();
    const discounts = await this.prisma.discount.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: DiscountStatus.ACTIVE,
        ...(type ? { type } : {}),
        ...(valueType ? { valueType } : {}),
        ...(normalizedSearch ? { name: { contains: normalizedSearch, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        valueType: true,
        value: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return discounts.map((discount) => ({
      id: discount.id.toString(),
      name: discount.name,
      type: discount.type,
      valueType: discount.valueType,
      value: discount.value.toString(),
      status: discount.status,
    }));
  }
}
