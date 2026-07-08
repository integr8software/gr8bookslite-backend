import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChartAccount,
  Discount,
  DiscountStatus,
  DiscountType,
  DiscountValueType,
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getGeneratedDiscountAccountTitle,
  resolveDiscountChartAccount,
} from './utils/discount-chart-account.util';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { GetDiscountListQueryDto } from './dto/get-discount-list-query.dto';
import { ImportDiscountsDto } from './dto/import-discounts.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

const DiscountManagementPermissionCode = 'DSM';
const DefaultPage = 1;
const DefaultLimit = 500;
const SystemGeneratedLabel = 'System Generated';

type DiscountWithAccount = Discount & {
  chartAccount: ChartAccount;
};

@Injectable()
export class DiscountMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetDiscountListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [discounts, total, statistics] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        include: { chartAccount: true },
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
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const discount = await this.findDiscountOrThrow(
      companyId,
      parseBigIntId(id),
    );

    return {
      discount: (await this.mapDiscountsWithAuditUsers([discount]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateDiscountDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
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
          include: { chartAccount: true },
        });
      });

      return {
        message: 'Discount created successfully.',
        discount: (await this.mapDiscountsWithAuditUsers([discount]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateDiscountDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const discountId = parseBigIntId(id);
    const current = await this.findDiscountOrThrow(companyId, discountId);

    const nextName = dto.name?.trim() ?? current.name;
    const nextType = dto.type ?? current.type;
    const nextValueType = dto.valueType ?? current.valueType;
    const nextValue =
      dto.value === undefined ? Number(current.value) : Number(dto.value);

    this.validateDiscountValue(nextValueType, nextValue);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, discountId);
    }

    try {
      const discount = await this.prisma.$transaction(async (tx) => {
        const needsNewAccount =
          dto.name !== undefined || dto.type !== undefined;
        const chartAccount = needsNewAccount
          ? await resolveDiscountChartAccount(tx, {
              companyId,
              type: nextType,
              accountTitle: getGeneratedDiscountAccountTitle(
                nextType,
                nextName,
              ),
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
          include: { chartAccount: true },
        });
      });

      return {
        message: 'Discount updated successfully.',
        discount: (await this.mapDiscountsWithAuditUsers([discount]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async importDiscounts(user: AuthUser, dto: ImportDiscountsDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
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
      throw new ConflictException(
        `Discount already exists: ${existingDiscounts[0].name}.`,
      );
    }

    const discounts = await this.prisma.$transaction(async (tx) => {
      for (const input of dto.discounts) {
        const chartAccount = await resolveDiscountChartAccount(tx, {
          companyId,
          type: input.type,
          accountTitle: getGeneratedDiscountAccountTitle(
            input.type,
            input.name,
          ),
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
        include: { chartAccount: true },
        orderBy: [{ name: 'asc' }],
      });
    });

    return {
      message: `${discounts.length} discount${discounts.length === 1 ? '' : 's'} imported successfully.`,
      discounts: await this.mapDiscountsWithAuditUsers(discounts),
    };
  }

  private buildListWhere(
    companyId: number,
    query: GetDiscountListQueryDto,
  ): Prisma.DiscountWhereInput {
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

  private buildOrderBy(
    query: GetDiscountListQueryDto,
  ): Prisma.DiscountOrderByWithRelationInput[] {
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
          if (group.status === DiscountStatus.ACTIVE)
            statistics.activeDiscounts += count;
          if (group.status === DiscountStatus.INACTIVE)
            statistics.inactiveDiscounts += count;
          if (group.type === DiscountType.PURCHASE)
            statistics.purchaseDiscounts += count;
          if (group.type === DiscountType.SALES)
            statistics.salesDiscounts += count;
          if (group.valueType === DiscountValueType.PERCENTAGE)
            statistics.percentageDiscounts += count;
        }

        return statistics;
      });
  }

  private async mapDiscountsWithAuditUsers(discounts: DiscountWithAccount[]) {
    const userIds = [
      ...new Set(
        discounts.flatMap((discount) =>
          [discount.createdByUserId, discount.updatedByUserId].filter(
            (userId): userId is number => userId !== null,
          ),
        ),
      ),
    ];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const userNames = new Map(users.map((user) => [user.id, user.name]));

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
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
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
      throw new BadRequestException(
        'Percentage discount value cannot exceed 100.',
      );
    }
  }

  private async findDiscountOrThrow(companyId: number, discountId: bigint) {
    const discount = await this.prisma.discount.findFirst({
      where: {
        id: discountId,
        companyId,
        deletedAt: null,
      },
      include: { chartAccount: true },
    });

    if (!discount) {
      throw new NotFoundException('Discount definition not found.');
    }

    return discount;
  }

  private async ensureNameAvailable(
    companyId: number,
    name: string,
    excludedDiscountId?: bigint,
  ) {
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
      const normalizedName = discount.name
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(
          `Duplicate discount in upload: ${discount.name.trim()}.`,
        );
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
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(
    user: AuthUser,
    companyId: number,
    action: PermissionAction,
  ) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (
      user.companyId === companyId &&
      user.permissions.includes(`${DiscountManagementPermissionCode}:${action}`)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage discount definitions.',
    );
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

    return (
      user.companyId === companyId &&
      user.permissions.includes(`${DiscountManagementPermissionCode}:${action}`)
    );
  }

  private hasReservedRoleAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      (user.role === AppRole.ADMIN ||
        user.membershipRole === MembershipRole.ADMIN)
    );
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A discount with this name already exists.');
    }
  }
}

function mapDiscount(
  discount: DiscountWithAccount,
  userNames: Map<number, string>,
) {
  return {
    id: discount.id.toString(),
    name: discount.name,
    description: discount.description ?? '',
    type: discount.type,
    valueType: discount.valueType,
    value: discount.value.toString(),
    status: discount.status,
    chartAccountId: discount.chartAccountId.toString(),
    accountCode: discount.chartAccount.accountCode,
    accountTitle: discount.chartAccount.accountTitle,
    accountGroupPath:
      discount.type === DiscountType.PURCHASE
        ? 'Cost of Sales > Purchase Discount'
        : 'Sales > Sales Discount',
    createdBy:
      discount.createdByUserId === null
        ? SystemGeneratedLabel
        : (userNames.get(discount.createdByUserId) ?? null),
    createdAt: discount.createdAt,
    updatedBy:
      (discount.updatedByUserId && userNames.get(discount.updatedByUserId)) ??
      null,
    updatedAt: discount.updatedAt,
  };
}

function parseBigIntId(value: string, label = 'id') {
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }

  const id = BigInt(value);

  if (id <= 0n) {
    throw new BadRequestException(`${label} must be a positive integer.`);
  }

  return id;
}
