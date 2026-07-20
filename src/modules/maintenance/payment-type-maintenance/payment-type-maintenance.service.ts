import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, PaymentType, PaymentTypeClassification, PaymentTypeStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { GetPaymentTypeListQueryDto } from './dto/get-payment-type-list-query.dto';
import { ImportPaymentTypesDto } from './dto/import-payment-types.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { mapPaymentType } from './mappers/payment-type-maintenance.mapper';

@Injectable()
export class PaymentTypeMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetPaymentTypeListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [paymentTypes, total, statistics] = await Promise.all([
      this.prisma.paymentType.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.paymentType.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      paymentTypes: await this.mapPaymentTypesWithAuditUsers(paymentTypes),
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
    const paymentType = await this.findPaymentTypeOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      paymentType: (await this.mapPaymentTypesWithAuditUsers([paymentType]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreatePaymentTypeDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    await this.ensureNameAvailable(companyId, dto.name);
    const sortOrder = dto.sortOrder ?? (await this.getNextPaymentTypeSortOrder(companyId));

    try {
      const paymentType = await this.prisma.paymentType.create({
        data: {
          companyId,
          ...this.toCreatePaymentTypeData(dto),
          sortOrder,
          status: dto.status ?? PaymentTypeStatus.ACTIVE,
          createdByUserId: user.id,
        },
      });

      return {
        message: 'Payment type created successfully.',
        paymentType: (await this.mapPaymentTypesWithAuditUsers([paymentType]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdatePaymentTypeDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const paymentTypeId = parsePositiveBigIntId(id);

    await this.findPaymentTypeOrThrow(companyId, paymentTypeId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, paymentTypeId);
    }

    try {
      const paymentType = await this.prisma.paymentType.update({
        where: {
          id: paymentTypeId,
        },
        data: {
          ...this.toPaymentTypeData(dto),
          updatedByUserId: user.id,
        },
      });

      return {
        message: 'Payment type updated successfully.',
        paymentType: (await this.mapPaymentTypesWithAuditUsers([paymentType]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async importPaymentTypes(user: AuthUser, dto: ImportPaymentTypesDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.ensureNoDuplicateImportNames(dto.paymentTypes);

    const existingPaymentTypes = await this.prisma.paymentType.findMany({
      where: {
        companyId,
        deletedAt: null,
        name: {
          in: dto.paymentTypes.map((paymentType) => paymentType.name.trim()),
          mode: 'insensitive',
        },
      },
      select: {
        name: true,
      },
    });

    if (existingPaymentTypes.length > 0) {
      throw new ConflictException(`Payment type already exists: ${existingPaymentTypes[0].name}.`);
    }

    const paymentTypes = await this.prisma.$transaction(async (tx) => {
      await tx.paymentType.createMany({
        data: dto.paymentTypes.map((paymentType) => ({
          companyId,
          ...this.toCreatePaymentTypeData(paymentType),
          status: paymentType.status ?? PaymentTypeStatus.ACTIVE,
          createdByUserId: user.id,
        })),
      });

      return tx.paymentType.findMany({
        where: {
          companyId,
          name: {
            in: dto.paymentTypes.map((paymentType) => paymentType.name.trim()),
            mode: 'insensitive',
          },
          deletedAt: null,
        },
        orderBy: [{ name: 'asc' }],
      });
    });

    return {
      message: `${paymentTypes.length} payment type${paymentTypes.length === 1 ? '' : 's'} imported successfully.`,
      paymentTypes: await this.mapPaymentTypesWithAuditUsers(paymentTypes),
    };
  }

  private buildListWhere(companyId: number, query: GetPaymentTypeListQueryDto): Prisma.PaymentTypeWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.classification ? { classification: query.classification } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetPaymentTypeListQueryDto): Prisma.PaymentTypeOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.paymentType
      .groupBy({
        by: ['status', 'classification'],
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
          totalPaymentTypes: 0,
          activePaymentTypes: 0,
          inactivePaymentTypes: 0,
          cashPaymentTypes: 0,
          bankTransferPaymentTypes: 0,
          checkPaymentTypes: 0,
          digitalWalletPaymentTypes: 0,
          nonCashSettlementPaymentTypes: 0,
        };

        for (const group of groups) {
          const count = group._count._all;

          statistics.totalPaymentTypes += count;
          if (group.status === PaymentTypeStatus.ACTIVE) {
            statistics.activePaymentTypes += count;
          }
          if (group.status === PaymentTypeStatus.INACTIVE) {
            statistics.inactivePaymentTypes += count;
          }
          if (group.classification === PaymentTypeClassification.CASH) {
            statistics.cashPaymentTypes += count;
          }
          if (group.classification === PaymentTypeClassification.BANK_TRANSFER) {
            statistics.bankTransferPaymentTypes += count;
          }
          if (group.classification === PaymentTypeClassification.CHECK) {
            statistics.checkPaymentTypes += count;
          }
          if (group.classification === PaymentTypeClassification.DIGITAL_WALLET) {
            statistics.digitalWalletPaymentTypes += count;
          }
          if (group.classification === PaymentTypeClassification.NON_CASH_SETTLEMENT) {
            statistics.nonCashSettlementPaymentTypes += count;
          }
        }

        return statistics;
      });
  }

  private async mapPaymentTypesWithAuditUsers(paymentTypes: PaymentType[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      paymentTypes.flatMap((paymentType) => [paymentType.createdByUserId, paymentType.updatedByUserId]),
    );

    return paymentTypes.map((paymentType) => mapPaymentType(paymentType, userNames));
  }

  private toCreatePaymentTypeData(dto: CreatePaymentTypeDto) {
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      classification: dto.classification,
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };
  }

  private toPaymentTypeData(dto: UpdatePaymentTypeDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.classification !== undefined ? { classification: dto.classification } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private async getNextPaymentTypeSortOrder(companyId: number) {
    const lastPaymentType = await this.prisma.paymentType.findFirst({
      where: { companyId, deletedAt: null },
      orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
      select: { sortOrder: true },
    });

    return (lastPaymentType?.sortOrder ?? 0) + 10;
  }

  private async findPaymentTypeOrThrow(companyId: number, paymentTypeId: bigint) {
    const paymentType = await this.prisma.paymentType.findFirst({
      where: {
        id: paymentTypeId,
        companyId,
        deletedAt: null,
      },
    });

    if (!paymentType) {
      throw new NotFoundException('Payment type not found.');
    }

    return paymentType;
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedPaymentTypeId?: bigint) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Payment type name is required.');
    }

    const existingPaymentType = await this.prisma.paymentType.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedPaymentTypeId ? { not: excludedPaymentTypeId } : undefined,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingPaymentType) {
      throw new ConflictException('A payment type with this name already exists.');
    }
  }

  private ensureNoDuplicateImportNames(paymentTypes: CreatePaymentTypeDto[]) {
    const names = new Set<string>();

    for (const paymentType of paymentTypes) {
      const normalizedName = paymentType.name.trim().replace(/\s+/g, ' ').toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(`Duplicate payment type in upload: ${paymentType.name.trim()}.`);
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

    if (user.companyId === companyId && user.permissions.includes(`PT:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage payment types.');
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

    return user.companyId === companyId && user.permissions.includes(`PT:${action}`);
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
      throw new ConflictException('A payment type with this name already exists.');
    }
  }
}
