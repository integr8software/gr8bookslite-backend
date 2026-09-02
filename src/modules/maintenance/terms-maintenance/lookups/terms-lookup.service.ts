import { Injectable } from '@nestjs/common';
import { TermStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TermLookupQueryDto } from '../dto/term-lookup-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class TermsLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: TermLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      terms: await this.findOptions({
        companyId,
        search: query.search,
        dateMode: query.dateMode,
      }),
    };
  }

  async findOptions({ companyId, search, dateMode }: { companyId: number; search?: string; dateMode?: TermLookupQueryDto['dateMode'] }) {
    const normalizedSearch = search?.trim();
    const terms = await this.prisma.term.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: TermStatus.ACTIVE,
        ...(dateMode ? { dateMode } : {}),
        ...(normalizedSearch ? { name: { contains: normalizedSearch, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        dateMode: true,
        period: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return terms.map((term) => ({
      id: term.id.toString(),
      name: term.name,
      dateMode: term.dateMode,
      period: term.period,
      status: term.status,
    }));
  }
}
