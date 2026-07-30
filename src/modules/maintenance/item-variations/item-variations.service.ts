import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ItemAttributeStatus as ItemVariationStatus,
  ItemAttributeUsage as ItemVariationUsage,
  ItemAttributeValue as ItemVariationValue,
  ItemAttributeValueStatus as ItemVariationValueStatus,
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateItemVariationDto } from './dto/create-item-variation.dto';
import { ItemVariationValueDto } from './dto/item-variation-value.dto';
import { UpdateItemVariationDto } from './dto/update-item-variation.dto';
import { mapItemVariation } from './mappers/item-variation.mapper';
import { ItemVariationWithValues, ItemVariationWithValuesInclude } from './types/item-variation-with-values.type';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
const ItemVariationsModuleCode = 'IV';

@Injectable()
export class ItemVariationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const [variations, statistics] = await Promise.all([
      this.prisma.itemAttribute.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        include: ItemVariationWithValuesInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.getStatistics(companyId),
    ]);

    return {
      variations: await this.mapVariationsWithAuditUsers(variations),
      permissions: this.getPermissions(user, companyId),
      statistics,
    };
  }

  async findOptions(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    const variations = await this.prisma.itemAttribute.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ItemVariationStatus.ACTIVE,
      },
      include: {
        values: {
          where: {
            status: ItemVariationValueStatus.ACTIVE,
          },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return {
      variations: variations.map((variation) => ({
        id: variation.id.toString(),
        code: variation.code,
        name: variation.name,
        usage: variation.usage,
        requiredOnItem: variation.requiredOnItem,
        affectsStock: variation.affectsStock,
        status: variation.status,
        values: variation.values.map((value) => ({
          id: value.id.toString(),
          label: value.label,
          isUsed: value.isUsed,
          status: value.status,
        })),
      })),
    };
  }

  async create(user: AuthUser, dto: CreateItemVariationDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    const values = dto.values ?? [];
    await this.ensureNameAvailable(companyId, dto.name);
    this.ensureUniqueValueLabels(values);

    try {
      const variation = await this.prisma.$transaction(async (tx) => {
        const code = await this.createNextCode(tx, companyId);

        return tx.itemAttribute.create({
          data: {
            companyId,
            code,
            ...this.toCreateVariationData(dto),
            status: dto.status ?? ItemVariationStatus.ACTIVE,
            createdByUserId: user.id,
            values: {
              create: values.map((value, index) => this.toCreateValueData(value, index)),
            },
          },
          include: ItemVariationWithValuesInclude,
        });
      });

      return {
        message: 'Item variation created successfully.',
        variation: (await this.mapVariationsWithAuditUsers([variation]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateItemVariationDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const variationId = parsePositiveBigIntId(id);
    const variation = await this.findVariationOrThrow(companyId, variationId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, variationId);
    }
    if (dto.values !== undefined) {
      this.ensureUniqueValueLabels(dto.values);
      this.ensureUsedValuesRemain(variation.values, dto.values);
    }

    try {
      const updatedVariation = await this.prisma.$transaction(async (tx) => {
        await tx.itemAttribute.update({
          where: { id: variationId },
          data: {
            ...this.toVariationData(dto),
            updatedByUserId: user.id,
          },
        });

        if (dto.values !== undefined) {
          await this.syncValues(tx, variationId, variation.values, dto.values);
        }

        return tx.itemAttribute.findUniqueOrThrow({
          where: { id: variationId },
          include: ItemVariationWithValuesInclude,
        });
      });

      return {
        message: 'Item variation updated successfully.',
        variation: (await this.mapVariationsWithAuditUsers([updatedVariation]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  private async syncValues(tx: Prisma.TransactionClient, variationId: bigint, existingValues: ItemVariationValue[], nextValues: ItemVariationValueDto[]) {
    const existingValueById = new Map(existingValues.map((value) => [value.id.toString(), value]));
    const nextExistingIds = new Set<string>();

    for (const [index, value] of nextValues.entries()) {
      const existingValue = value.id ? existingValueById.get(value.id) : undefined;

      if (existingValue) {
        nextExistingIds.add(existingValue.id.toString());
        await tx.itemAttributeValue.update({
          where: { id: existingValue.id },
          data: {
            label: this.normalizeLabel(value.label),
            sortOrder: value.sortOrder ?? index + 1,
            isUsed: existingValue.isUsed || Boolean(value.isUsed),
            status: value.status ?? existingValue.status,
            deletedAt: null,
          },
        });
        continue;
      }

      await tx.itemAttributeValue.create({
        data: {
          attributeId: variationId,
          ...this.toCreateValueData(value, index),
        },
      });
    }

    const removableValues = existingValues.filter((value) => !nextExistingIds.has(value.id.toString()) && !value.isUsed);

    if (removableValues.length > 0) {
      await tx.itemAttributeValue.updateMany({
        where: {
          id: {
            in: removableValues.map((value) => value.id),
          },
        },
        data: {
          deletedAt: new Date(),
          status: ItemVariationValueStatus.INACTIVE,
        },
      });
    }
  }

  private async findVariationOrThrow(companyId: number, variationId: bigint) {
    const variation = await this.prisma.itemAttribute.findFirst({
      where: {
        id: variationId,
        companyId,
        deletedAt: null,
      },
      include: ItemVariationWithValuesInclude,
    });

    if (!variation) {
      throw new NotFoundException('Item variation not found.');
    }

    return variation;
  }

  private async mapVariationsWithAuditUsers(variations: ItemVariationWithValues[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      variations.flatMap((variation) => [variation.createdByUserId, variation.updatedByUserId]),
    );

    return variations.map((variation) => mapItemVariation(variation, userNames));
  }

  private async getStatistics(companyId: number) {
    const [variationGroups, valueGroups] = await Promise.all([
      this.prisma.itemAttribute.groupBy({
        by: ['status'],
        where: {
          companyId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.itemAttributeValue.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
          attribute: {
            companyId,
            deletedAt: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const statistics = {
      totalVariations: 0,
      activeVariations: 0,
      inactiveVariations: 0,
      totalValues: 0,
      activeValues: 0,
      inactiveValues: 0,
    };

    for (const group of variationGroups) {
      const count = group._count._all;
      statistics.totalVariations += count;
      if (group.status === ItemVariationStatus.ACTIVE) statistics.activeVariations += count;
      if (group.status === ItemVariationStatus.INACTIVE) statistics.inactiveVariations += count;
    }

    for (const group of valueGroups) {
      const count = group._count._all;
      statistics.totalValues += count;
      if (group.status === ItemVariationValueStatus.ACTIVE) statistics.activeValues += count;
      if (group.status === ItemVariationValueStatus.INACTIVE) statistics.inactiveValues += count;
    }

    return statistics;
  }

  private toCreateVariationData(dto: CreateItemVariationDto) {
    return {
      name: this.normalizeName(dto.name),
      usage: dto.usage ?? ItemVariationUsage.ITEM_DETAIL,
      requiredOnItem: dto.requiredOnItem ?? false,
      affectsStock: dto.affectsStock ?? false,
    };
  }

  private toVariationData(dto: UpdateItemVariationDto) {
    return {
      ...(dto.name !== undefined ? { name: this.normalizeName(dto.name) } : {}),
      ...(dto.usage !== undefined ? { usage: dto.usage } : {}),
      ...(dto.requiredOnItem !== undefined ? { requiredOnItem: dto.requiredOnItem } : {}),
      ...(dto.affectsStock !== undefined ? { affectsStock: dto.affectsStock } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private toCreateValueData(value: ItemVariationValueDto, index: number) {
    return {
      label: this.normalizeLabel(value.label),
      sortOrder: value.sortOrder ?? index + 1,
      isUsed: Boolean(value.isUsed),
      status: value.status ?? ItemVariationValueStatus.ACTIVE,
    };
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedVariationId?: bigint) {
    const normalizedName = this.normalizeName(name);

    if (!normalizedName) {
      throw new BadRequestException('Item variation name is required.');
    }

    const existingVariation = await this.prisma.itemAttribute.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedVariationId ? { not: excludedVariationId } : undefined,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingVariation) {
      throw new ConflictException('An item variation with this name already exists.');
    }
  }

  private ensureUniqueValueLabels(values: ItemVariationValueDto[]) {
    const labels = new Set<string>();

    for (const value of values) {
      const normalizedLabel = this.normalizeLabel(value.label);

      if (!normalizedLabel) {
        throw new BadRequestException('Item variation values cannot be blank.');
      }
      if (labels.has(normalizedLabel.toLowerCase())) {
        throw new BadRequestException(`Duplicate item variation value: ${normalizedLabel}.`);
      }

      labels.add(normalizedLabel.toLowerCase());
    }
  }

  private ensureUsedValuesRemain(existingValues: ItemVariationValue[], nextValues: ItemVariationValueDto[]) {
    const nextValueIds = new Set(nextValues.map((value) => value.id).filter(Boolean));
    const removedUsedValue = existingValues.find((value) => value.isUsed && !nextValueIds.has(value.id.toString()));

    if (removedUsedValue) {
      throw new BadRequestException(`Value "${removedUsedValue.label}" is already used and cannot be deleted. Deactivate it instead.`);
    }
  }

  private normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeLabel(label: string) {
    return label.trim().replace(/\s+/g, ' ');
  }

  private async createNextCode(tx: Prisma.TransactionClient, companyId: number) {
    const existingVariations = await tx.itemAttribute.findMany({
      where: { companyId },
      select: { code: true },
    });
    const usedCodes = new Set(existingVariations.map((variation) => variation.code));
    let nextNumber = existingVariations.reduce((max, variation) => {
      const match = /^ATT-(\d+)$/.exec(variation.code);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    do {
      nextNumber += 1;
      const code = `ATT-${nextNumber.toString().padStart(3, '0')}`;
      if (!usedCodes.has(code)) {
        return code;
      }
    } while (nextNumber < 999999);

    throw new BadRequestException('Unable to generate item variation code.');
  }



  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${ItemVariationsModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage item variations.');
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

    return user.companyId === companyId && user.permissions.includes(`${ItemVariationsModuleCode}:${action}`);
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
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : '';
      if (target.includes('code')) {
        throw new ConflictException('An item variation with this code already exists.');
      }
      throw new ConflictException('An item variation with this name already exists.');
    }
  }
}
