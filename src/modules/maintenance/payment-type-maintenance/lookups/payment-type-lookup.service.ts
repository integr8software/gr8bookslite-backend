import { Injectable } from '@nestjs/common';
import { PaymentTypeStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentTypeLookupQueryDto } from '../dto/payment-type-lookup-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class PaymentTypeLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: PaymentTypeLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      paymentTypes: await this.findOptions({
        companyId,
        search: query.search,
        classification: query.classification,
      }),
    };
  }

  async findOptions({
    companyId,
    search,
    classification,
  }: {
    companyId: number;
    search?: string;
    classification?: PaymentTypeLookupQueryDto['classification'];
  }) {
    const normalizedSearch = search?.trim();
    const paymentTypes = await this.prisma.paymentType.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: PaymentTypeStatus.ACTIVE,
        ...(classification ? { classification } : {}),
        ...(normalizedSearch ? { name: { contains: normalizedSearch, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        classification: true,
        sortOrder: true,
        status: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });

    return paymentTypes.map((paymentType) => ({
      id: paymentType.id.toString(),
      name: paymentType.name,
      classification: paymentType.classification,
      sortOrder: paymentType.sortOrder,
      status: paymentType.status,
    }));
  }
}
