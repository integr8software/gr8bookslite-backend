import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountStatus, DiscountType, DiscountValueType, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { GetDiscountListQueryDto } from './dto/get-discount-list-query.dto';
import { ImportDiscountsDto } from './dto/import-discounts.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { mapDiscount } from './mappers/discount-maintenance.mapper';
import { DiscountInclude } from './prisma/discount.include';
import { DiscountLookupQueryDto } from './dto/discount-lookup-query.dto';
import type { DiscountWithAccount } from './types/discount-with-account.type';
import { getGeneratedDiscountAccountTitle, resolveDiscountChartAccount } from './utils/discount-chart-account.util';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { normalizeWhitespace } from '../../../common/utils/string-normalization.util';
@Injectable()
export class DiscountMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetDiscountListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DSM', PermissionAction.VIEW, 'You do not have permission to manage discount definitions.');

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [discounts, total, statistics] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        include: DiscountInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.discount.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      discounts: await this.mapDiscountsWithAuditUsers(discounts),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: getModulePermissions(user, companyId, 'DSM', { includeImport: true }),
    };
  }

  async findOptions(user: AuthUser, query: DiscountLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const search = query.search?.trim();

    const discounts = await this.prisma.discount.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: DiscountStatus.ACTIVE,
        ...(query.type ? { type: query.type } : {}),
        ...(query.valueType ? { valueType: query.valueType } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
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

    return {
      discounts: discounts.map((discount) => ({
        id: discount.id.toString(),
        name: discount.name,
        type: discount.type,
        valueType: discount.valueType,
        value: discount.value.toString(),
        status: discount.status,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DSM', PermissionAction.VIEW, 'You do not have permission to manage discount definitions.');
    const discount = await this.findDiscountOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      discount: (await this.mapDiscountsWithAuditUsers([discount]))[0],
      permissions: getModulePermissions(user, companyId, 'DSM', { includeImport: true }),
    };
  }

  async create(user: AuthUser, dto: CreateDiscountDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DSM', PermissionAction.CREATE, 'You do not have permission to manage discount definitions.');
    this.validateDiscountValue(dto.valueType, dto.value);
    await this.ensureNameAvailable(companyId, dto.name);

    try {
      const discount = await this.prisma.$transaction(async (tx) => {
        const chartAccount = await resolveDiscountChartAccount(tx, {
          companyId,
          type: dto.type,
          accountTitle: getGeneratedDiscountAccountTitle(dto.type, dto.name),
          createdByUserId: user.id,
        });

        return tx.discount.create({
          data: {
            companyId,
            chartAccountId: chartAccount.id,
            ...this.toCreateDiscountData(dto),
            status: dto.status ?? DiscountStatus.ACTIVE,
            createdByUserId: user.id,
          },
          include: DiscountInclude,
        });
      });

      return {
        message: 'Discount created successfully.',
        discount: (await this.mapDiscountsWithAuditUsers([discount]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'A discount with this name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateDiscountDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DSM', PermissionAction.UPDATE, 'You do not have permission to manage discount definitions.');
    const discountId = parsePositiveBigIntId(id);
    const current = await this.findDiscountOrThrow(companyId, discountId);

    const nextName = dto.name?.trim() ?? current.name;
    const nextType = dto.type ?? current.type;
    const nextValueType = dto.valueType ?? current.valueType;
    const nextValue = dto.value === undefined ? Number(current.value) : Number(dto.value);

    this.validateDiscountValue(nextValueType, nextValue);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, discountId);
    }

    try {
      const discount = await this.prisma.$transaction(async (tx) => {
        const needsNewAccount = dto.name !== undefined || dto.type !== undefined;
        const chartAccount = needsNewAccount
          ? await resolveDiscountChartAccount(tx, {
              companyId,
              type: nextType,
              accountTitle: getGeneratedDiscountAccountTitle(nextType, nextName),
              createdByUserId: user.id,
            })
          : current.chartAccount;

        return tx.discount.update({
          where: { id: discountId },
          data: {
            ...this.toDiscountData(dto),
            chartAccountId: chartAccount.id,
            updatedByUserId: user.id,
          },
          include: DiscountInclude,
        });
      });

      return {
        message: 'Discount updated successfully.',
        discount: (await this.mapDiscountsWithAuditUsers([discount]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'A discount with this name already exists.');
      throw error;
    }
  }

  async importDiscounts(user: AuthUser, dto: ImportDiscountsDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DSM', PermissionAction.CREATE, 'You do not have permission to manage discount definitions.');
    this.ensureNoDuplicateImportNames(dto.discounts);

    for (const discount of dto.discounts) {
      this.validateDiscountValue(discount.valueType, discount.value);
    }

    const existingDiscounts = await this.prisma.discount.findMany({
      where: {
        companyId,
        deletedAt: null,
        name: {
          in: dto.discounts.map((discount) => discount.name.trim()),
          mode: 'insensitive',
        },
      },
      select: { name: true },
    });

    if (existingDiscounts.length > 0) {
      throw new ConflictException(`Discount already exists: ${existingDiscounts[0].name}.`);
    }

    const discounts = await this.prisma.$transaction(async (tx) => {
      for (const input of dto.discounts) {
        const chartAccount = await resolveDiscountChartAccount(tx, {
          companyId,
          type: input.type,
          accountTitle: getGeneratedDiscountAccountTitle(input.type, input.name),
          createdByUserId: user.id,
        });

        await tx.discount.create({
          data: {
            companyId,
            chartAccountId: chartAccount.id,
            ...this.toCreateDiscountData(input),
            status: input.status ?? DiscountStatus.ACTIVE,
            createdByUserId: user.id,
          },
        });
      }

      return tx.discount.findMany({
        where: {
          companyId,
          name: {
            in: dto.discounts.map((discount) => discount.name.trim()),
            mode: 'insensitive',
          },
          deletedAt: null,
        },
        include: DiscountInclude,
        orderBy: [{ name: 'asc' }],
      });
    });

    return {
      message: `${discounts.length} discount${discounts.length === 1 ? '' : 's'} imported successfully.`,
      discounts: await this.mapDiscountsWithAuditUsers(discounts),
    };
  }

  private buildListWhere(companyId: number, query: GetDiscountListQueryDto): Prisma.DiscountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.valueType ? { valueType: query.valueType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              {
                chartAccount: {
                  accountCode: { contains: search, mode: 'insensitive' },
                },
              },
              {
                chartAccount: {
                  accountTitle: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetDiscountListQueryDto): Prisma.DiscountOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';
    const field = sortBy === 'valueType' ? 'valueType' : sortBy;

    return [{ [field]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.discount
      .groupBy({
        by: ['status', 'type', 'valueType'],
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
          totalDiscounts: 0,
          activeDiscounts: 0,
          inactiveDiscounts: 0,
          purchaseDiscounts: 0,
          salesDiscounts: 0,
          percentageDiscounts: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalDiscounts += count;
          if (group.status === DiscountStatus.ACTIVE) statistics.activeDiscounts += count;
          if (group.status === DiscountStatus.INACTIVE) statistics.inactiveDiscounts += count;
          if (group.type === DiscountType.PURCHASES) statistics.purchaseDiscounts += count;
          if (group.type === DiscountType.SALES) statistics.salesDiscounts += count;
          if (group.valueType === DiscountValueType.PERCENTAGE) statistics.percentageDiscounts += count;
        }

        return statistics;
      });
  }

  private async mapDiscountsWithAuditUsers(discounts: DiscountWithAccount[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      discounts.flatMap((discount) => [discount.createdByUserId, discount.updatedByUserId]),
    );

    return discounts.map((discount) => mapDiscount(discount, userNames));
  }

  private toCreateDiscountData(dto: CreateDiscountDto) {
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      type: dto.type,
      valueType: dto.valueType,
      value: dto.value,
    };
  }

  private toDiscountData(dto: UpdateDiscountDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.valueType !== undefined ? { valueType: dto.valueType } : {}),
      ...(dto.value !== undefined ? { value: dto.value } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private validateDiscountValue(valueType: DiscountValueType, value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Discount value must be zero or greater.');
    }

    if (valueType === DiscountValueType.PERCENTAGE && value > 100) {
      throw new BadRequestException('Percentage discount value cannot exceed 100.');
    }
  }

  private async findDiscountOrThrow(companyId: number, discountId: bigint) {
    const discount = await this.prisma.discount.findFirst({
      where: {
        id: discountId,
        companyId,
        deletedAt: null,
      },
      include: DiscountInclude,
    });

    if (!discount) {
      throw new NotFoundException('Discount definition not found.');
    }

    return discount;
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedDiscountId?: bigint) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Discount name is required.');
    }

    const existingDiscount = await this.prisma.discount.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedDiscountId ? { not: excludedDiscountId } : undefined,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existingDiscount) {
      throw new ConflictException('A discount with this name already exists.');
    }
  }

  private ensureNoDuplicateImportNames(discounts: CreateDiscountDto[]) {
    const names = new Set<string>();

    for (const discount of discounts) {
      const normalizedName = normalizeWhitespace(discount.name).toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(`Duplicate discount in upload: ${discount.name.trim()}.`);
      }

      names.add(normalizedName);
    }
  }
}
