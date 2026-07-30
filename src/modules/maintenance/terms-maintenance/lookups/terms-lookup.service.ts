import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, TermStatus } from '@prisma/client';
import { AppRole } from '../../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TermLookupQueryDto } from '../dto/term-lookup-query.dto';

@Injectable()
export class TermsLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: TermLookupQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    return {
      terms: await this.findOptions({
        companyId,
        search: query.search,
        dateMode: query.dateMode,
      }),
    };
  }

  async findOptions({
    companyId,
    search,
    dateMode,
  }: {
    companyId: number;
    search?: string;
    dateMode?: TermLookupQueryDto['dateMode'];
  }) {
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

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }
}
