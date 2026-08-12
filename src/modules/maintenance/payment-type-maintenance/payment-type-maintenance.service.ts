import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentType, PaymentTypeClassification, PaymentTypeStatus, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { GetPaymentTypeListQueryDto } from './dto/get-payment-type-list-query.dto';
import { ImportPaymentTypesDto } from './dto/import-payment-types.dto';
import { PaymentTypeLookupQueryDto } from './dto/payment-type-lookup-query.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { mapPaymentType } from './mappers/payment-type-maintenance.mapper';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { normalizeWhitespace } from '../../../common/utils/string-normalization.util';
@Injectable()
export class PaymentTypeMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetPaymentTypeListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'PT', PermissionAction.VIEW, 'You do not have permission to manage payment types.');

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
      permissions: getModulePermissions(user, companyId, 'PT', { includeImport: true }),
    };
  }

  async findOptions(user: AuthUser, query: PaymentTypeLookupQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const search = query.search?.trim();

    const paymentTypes = await this.prisma.paymentType.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: PaymentTypeStatus.ACTIVE,
        ...(query.classification ? { classification: query.classification } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
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

    return {
      paymentTypes: paymentTypes.map((paymentType) => ({
        id: paymentType.id.toString(),
        name: paymentType.name,
        classification: paymentType.classification,
        sortOrder: paymentType.sortOrder,
        status: paymentType.status,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'PT', PermissionAction.VIEW, 'You do not have permission to manage payment types.');
    const paymentType = await this.findPaymentTypeOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      paymentType: (await this.mapPaymentTypesWithAuditUsers([paymentType]))[0],
      permissions: getModulePermissions(user, companyId, 'PT', { includeImport: true }),
    };
  }

  async create(user: AuthUser, dto: CreatePaymentTypeDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'PT', PermissionAction.CREATE, 'You do not have permission to manage payment types.');

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
      throwConflictOnPrismaUniqueError(error, 'A payment type with this name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdatePaymentTypeDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'PT', PermissionAction.UPDATE, 'You do not have permission to manage payment types.');
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
      throwConflictOnPrismaUniqueError(error, 'A payment type with this name already exists.');
      throw error;
    }
  }

  async importPaymentTypes(user: AuthUser, dto: ImportPaymentTypesDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'PT', PermissionAction.CREATE, 'You do not have permission to manage payment types.');
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
      const normalizedName = normalizeWhitespace(paymentType.name).toLowerCase();

      if (names.has(normalizedName)) {
        throw new BadRequestException(`Duplicate payment type in upload: ${paymentType.name.trim()}.`);
      }

      names.add(normalizedName);
    }
  }
}
