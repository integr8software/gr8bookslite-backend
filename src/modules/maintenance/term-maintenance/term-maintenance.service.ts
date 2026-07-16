import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma, Term, TermDateMode, TermStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTermDto } from './dto/create-term.dto';
import { GetTermListQueryDto } from './dto/get-term-list-query.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { mapTerm } from './mappers/term-maintenance.mapper';

@Injectable()
export class TermMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetTermListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [terms, total, statistics] = await Promise.all([
      this.prisma.term.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.term.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      terms: await this.mapTermsWithAuditUsers(terms),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const term = await this.findTermOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      term: (await this.mapTermsWithAuditUsers([term]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateTermDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    await this.ensureNameAvailable(companyId, dto.name);

    try {
      const term = await this.prisma.term.create({
        data: {
          companyId,
          ...this.toCreateTermData(dto),
          status: dto.status ?? TermStatus.ACTIVE,
          createdByUserId: user.id,
        },
      });

      return {
        message: 'Term created successfully.',
        term: (await this.mapTermsWithAuditUsers([term]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateTermDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const termId = parsePositiveBigIntId(id);

    await this.findTermOrThrow(companyId, termId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, termId);
    }

    try {
      const term = await this.prisma.term.update({
        where: {
          id: termId,
        },
        data: {
          ...this.toTermData(dto),
          updatedByUserId: user.id,
        },
      });

      return {
        message: 'Term updated successfully.',
        term: (await this.mapTermsWithAuditUsers([term]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async importTerms(user: AuthUser, dto: ImportTermsDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.ensureNoDuplicateImportNames(dto.terms);

    const existingTerms = await this.prisma.term.findMany({
      where: {
        companyId,
        deletedAt: null,
        name: {
          in: dto.terms.map((term) => term.name.trim()),
          mode: 'insensitive',
        },
      },
      select: {
        name: true,
      },
    });

    if (existingTerms.length > 0) {
      throw new ConflictException(`Term already exists: ${existingTerms[0].name}.`);
    }

    const terms = await this.prisma.$transaction(async (tx) => {
      await tx.term.createMany({
        data: dto.terms.map((term) => ({
          companyId,
          ...this.toCreateTermData(term),
          status: term.status ?? TermStatus.ACTIVE,
          createdByUserId: user.id,
        })),
      });

      return tx.term.findMany({
        where: {
          companyId,
          name: {
            in: dto.terms.map((term) => term.name.trim()),
            mode: 'insensitive',
          },
          deletedAt: null,
        },
        orderBy: [{ name: 'asc' }],
      });
    });

    return {
      message: `${terms.length} term${terms.length === 1 ? '' : 's'} imported successfully.`,
      terms: await this.mapTermsWithAuditUsers(terms),
    };
  }

  private buildListWhere(companyId: number, query: GetTermListQueryDto): Prisma.TermWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.dateMode ? { dateMode: query.dateMode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }],
          }
        : {}),
    };
  }

  private async mapTermsWithAuditUsers(terms: Term[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      terms.flatMap((term) => [term.createdByUserId, term.updatedByUserId]),
    );

    return terms.map((term) => mapTerm(term, userNames));
  }

  private buildOrderBy(query: GetTermListQueryDto): Prisma.TermOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';
    const field = sortBy === 'dateMode' ? 'dateMode' : sortBy;

    return [{ [field]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.term
      .groupBy({
        by: ['status', 'dateMode'],
        where: {
          companyId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      })
      .then((groups) => {
        const statistics = {
          totalTerms: 0,
          activeTerms: 0,
          inactiveTerms: 0,
          dayTerms: 0,
          monthTerms: 0,
          yearTerms: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalTerms += count;
          if (group.status === TermStatus.ACTIVE) statistics.activeTerms += count;
          if (group.status === TermStatus.INACTIVE) statistics.inactiveTerms += count;
          if (group.dateMode === TermDateMode.DAY) statistics.dayTerms += count;
          if (group.dateMode === TermDateMode.MONTH) statistics.monthTerms += count;
          if (group.dateMode === TermDateMode.YEAR) statistics.yearTerms += count;
        }

        return statistics;
      });
  }

  private toCreateTermData(dto: CreateTermDto) {
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      dateMode: dto.dateMode,
      period: dto.period,
    };
  }

  private toTermData(dto: UpdateTermDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.dateMode !== undefined ? { dateMode: dto.dateMode } : {}),
      ...(dto.period !== undefined ? { period: dto.period } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private async findTermOrThrow(companyId: number, termId: bigint) {
    const term = await this.prisma.term.findFirst({
      where: {
        id: termId,
        companyId,
        deletedAt: null,
      },
    });

    if (!term) {
      throw new NotFoundException('Term definition not found.');
    }

    return term;
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedTermId?: bigint) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Term name is required.');
    }

    const existingTerm = await this.prisma.term.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedTermId ? { not: excludedTermId } : undefined,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTerm) {
      throw new ConflictException('A term with this name already exists.');
    }
  }

  private ensureNoDuplicateImportNames(terms: CreateTermDto[]) {
    const names = new Set<string>();

    for (const term of terms) {
      const normalizedName = term.name.trim().replace(/\s+/g, ' ').toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(`Duplicate term in upload: ${term.name.trim()}.`);
      }

      names.add(normalizedName);
    }
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

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`TM:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage term definitions.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
      canImport: this.can(user, companyId, PermissionAction.CREATE),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`TM:${action}`);
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A term with this name already exists.');
    }
  }
}
