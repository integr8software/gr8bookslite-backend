import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Term, TermDateMode, TermStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTermDto } from './dto/create-term.dto';
import { GetTermListQueryDto } from './dto/get-term-list-query.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { TermLookupQueryDto } from './dto/term-lookup-query.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { mapTerm } from './mappers/terms-maintenance.mapper';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { normalizeWhitespace } from '../../../common/utils/string-normalization.util';
@Injectable()
export class TermsMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetTermListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'TM', PermissionAction.VIEW, 'You do not have permission to manage term definitions.');

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
      permissions: getModulePermissions(user, companyId, 'TM', { includeImport: true }),
    };
  }

  async findOptions(user: AuthUser, query: TermLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const search = query.search?.trim();

    const terms = await this.prisma.term.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: TermStatus.ACTIVE,
        ...(query.dateMode ? { dateMode: query.dateMode } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
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

    return {
      terms: terms.map((term) => ({
        id: term.id.toString(),
        name: term.name,
        dateMode: term.dateMode,
        period: term.period,
        status: term.status,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'TM', PermissionAction.VIEW, 'You do not have permission to manage term definitions.');
    const term = await this.findTermOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      term: (await this.mapTermsWithAuditUsers([term]))[0],
      permissions: getModulePermissions(user, companyId, 'TM', { includeImport: true }),
    };
  }

  async create(user: AuthUser, dto: CreateTermDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'TM', PermissionAction.CREATE, 'You do not have permission to manage term definitions.');

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
      throwConflictOnPrismaUniqueError(error, 'A term with this name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateTermDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'TM', PermissionAction.UPDATE, 'You do not have permission to manage term definitions.');
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
      throwConflictOnPrismaUniqueError(error, 'A term with this name already exists.');
      throw error;
    }
  }

  async importTerms(user: AuthUser, dto: ImportTermsDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'TM', PermissionAction.CREATE, 'You do not have permission to manage term definitions.');
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
      const normalizedName = normalizeWhitespace(term.name).toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(`Duplicate term in upload: ${term.name.trim()}.`);
      }

      names.add(normalizedName);
    }
  }
}
