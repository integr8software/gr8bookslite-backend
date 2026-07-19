import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ItemAttributeStatus,
  ItemAttributeUsage,
  ItemAttributeValue,
  ItemAttributeValueStatus,
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
import { CreateItemAttributeDto } from './dto/create-item-attribute.dto';
import { ItemAttributeValueDto } from './dto/item-attribute-value.dto';
import { UpdateItemAttributeDto } from './dto/update-item-attribute.dto';
import { mapItemAttribute } from './mappers/item-attribute.mapper';
import { ItemAttributeWithValues, ItemAttributeWithValuesInclude } from './types/item-attribute-with-values.type';

const ItemAttributesModuleCode = 'IA';

@Injectable()
export class ItemAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const [attributes, statistics] = await Promise.all([
      this.prisma.itemAttribute.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        include: ItemAttributeWithValuesInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.getStatistics(companyId),
    ]);

    return {
      attributes: await this.mapAttributesWithAuditUsers(attributes),
      permissions: this.getPermissions(user, companyId),
      statistics,
    };
  }

  async findOptions(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    const attributes = await this.prisma.itemAttribute.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ItemAttributeStatus.ACTIVE,
      },
      include: {
        values: {
          where: {
            status: ItemAttributeValueStatus.ACTIVE,
          },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return {
      attributes: attributes.map((attribute) => ({
        id: attribute.id.toString(),
        code: attribute.code,
        name: attribute.name,
        usage: attribute.usage,
        requiredOnItem: attribute.requiredOnItem,
        affectsStock: attribute.affectsStock,
        status: attribute.status,
        values: attribute.values.map((value) => ({
          id: value.id.toString(),
          label: value.label,
          isUsed: value.isUsed,
          status: value.status,
        })),
      })),
    };
  }

  async create(user: AuthUser, dto: CreateItemAttributeDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    const values = dto.values ?? [];
    await this.ensureNameAvailable(companyId, dto.name);
    this.ensureUniqueValueLabels(values);

    try {
      const attribute = await this.prisma.$transaction(async (tx) => {
        const code = await this.createNextCode(tx, companyId);

        return tx.itemAttribute.create({
          data: {
            companyId,
            code,
            ...this.toCreateAttributeData(dto),
            status: dto.status ?? ItemAttributeStatus.ACTIVE,
            createdByUserId: user.id,
            values: {
              create: values.map((value, index) => this.toCreateValueData(value, index)),
            },
          },
          include: ItemAttributeWithValuesInclude,
        });
      });

      return {
        message: 'Item attribute created successfully.',
        attribute: (await this.mapAttributesWithAuditUsers([attribute]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateItemAttributeDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const attributeId = parsePositiveBigIntId(id);
    const attribute = await this.findAttributeOrThrow(companyId, attributeId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, attributeId);
    }
    if (dto.values !== undefined) {
      this.ensureUniqueValueLabels(dto.values);
      this.ensureUsedValuesRemain(attribute.values, dto.values);
    }

    try {
      const updatedAttribute = await this.prisma.$transaction(async (tx) => {
        await tx.itemAttribute.update({
          where: { id: attributeId },
          data: {
            ...this.toAttributeData(dto),
            updatedByUserId: user.id,
          },
        });

        if (dto.values !== undefined) {
          await this.syncValues(tx, attributeId, attribute.values, dto.values);
        }

        return tx.itemAttribute.findUniqueOrThrow({
          where: { id: attributeId },
          include: ItemAttributeWithValuesInclude,
        });
      });

      return {
        message: 'Item attribute updated successfully.',
        attribute: (await this.mapAttributesWithAuditUsers([updatedAttribute]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  private async syncValues(tx: Prisma.TransactionClient, attributeId: bigint, existingValues: ItemAttributeValue[], nextValues: ItemAttributeValueDto[]) {
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
          attributeId,
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
          status: ItemAttributeValueStatus.INACTIVE,
        },
      });
    }
  }

  private async findAttributeOrThrow(companyId: number, attributeId: bigint) {
    const attribute = await this.prisma.itemAttribute.findFirst({
      where: {
        id: attributeId,
        companyId,
        deletedAt: null,
      },
      include: ItemAttributeWithValuesInclude,
    });

    if (!attribute) {
      throw new NotFoundException('Item attribute not found.');
    }

    return attribute;
  }

  private async mapAttributesWithAuditUsers(attributes: ItemAttributeWithValues[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      attributes.flatMap((attribute) => [attribute.createdByUserId, attribute.updatedByUserId]),
    );

    return attributes.map((attribute) => mapItemAttribute(attribute, userNames));
  }

  private async getStatistics(companyId: number) {
    const [attributeGroups, valueGroups] = await Promise.all([
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
      totalAttributes: 0,
      activeAttributes: 0,
      inactiveAttributes: 0,
      totalValues: 0,
      activeValues: 0,
      inactiveValues: 0,
    };

    for (const group of attributeGroups) {
      const count = group._count._all;
      statistics.totalAttributes += count;
      if (group.status === ItemAttributeStatus.ACTIVE) statistics.activeAttributes += count;
      if (group.status === ItemAttributeStatus.INACTIVE) statistics.inactiveAttributes += count;
    }

    for (const group of valueGroups) {
      const count = group._count._all;
      statistics.totalValues += count;
      if (group.status === ItemAttributeValueStatus.ACTIVE) statistics.activeValues += count;
      if (group.status === ItemAttributeValueStatus.INACTIVE) statistics.inactiveValues += count;
    }

    return statistics;
  }

  private toCreateAttributeData(dto: CreateItemAttributeDto) {
    return {
      name: this.normalizeName(dto.name),
      usage: dto.usage ?? ItemAttributeUsage.ITEM_DETAIL,
      requiredOnItem: dto.requiredOnItem ?? false,
      affectsStock: dto.affectsStock ?? false,
    };
  }

  private toAttributeData(dto: UpdateItemAttributeDto) {
    return {
      ...(dto.name !== undefined ? { name: this.normalizeName(dto.name) } : {}),
      ...(dto.usage !== undefined ? { usage: dto.usage } : {}),
      ...(dto.requiredOnItem !== undefined ? { requiredOnItem: dto.requiredOnItem } : {}),
      ...(dto.affectsStock !== undefined ? { affectsStock: dto.affectsStock } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private toCreateValueData(value: ItemAttributeValueDto, index: number) {
    return {
      label: this.normalizeLabel(value.label),
      sortOrder: value.sortOrder ?? index + 1,
      isUsed: Boolean(value.isUsed),
      status: value.status ?? ItemAttributeValueStatus.ACTIVE,
    };
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedAttributeId?: bigint) {
    const normalizedName = this.normalizeName(name);

    if (!normalizedName) {
      throw new BadRequestException('Item attribute name is required.');
    }

    const existingAttribute = await this.prisma.itemAttribute.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedAttributeId ? { not: excludedAttributeId } : undefined,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingAttribute) {
      throw new ConflictException('An item attribute with this name already exists.');
    }
  }

  private ensureUniqueValueLabels(values: ItemAttributeValueDto[]) {
    const labels = new Set<string>();

    for (const value of values) {
      const normalizedLabel = this.normalizeLabel(value.label);

      if (!normalizedLabel) {
        throw new BadRequestException('Item attribute values cannot be blank.');
      }
      if (labels.has(normalizedLabel.toLowerCase())) {
        throw new BadRequestException(`Duplicate item attribute value: ${normalizedLabel}.`);
      }

      labels.add(normalizedLabel.toLowerCase());
    }
  }

  private ensureUsedValuesRemain(existingValues: ItemAttributeValue[], nextValues: ItemAttributeValueDto[]) {
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
    const existingAttributes = await tx.itemAttribute.findMany({
      where: { companyId },
      select: { code: true },
    });
    const usedCodes = new Set(existingAttributes.map((attribute) => attribute.code));
    let nextNumber = existingAttributes.reduce((max, attribute) => {
      const match = /^ATT-(\d+)$/.exec(attribute.code);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    do {
      nextNumber += 1;
      const code = `ATT-${nextNumber.toString().padStart(3, '0')}`;
      if (!usedCodes.has(code)) {
        return code;
      }
    } while (nextNumber < 999999);

    throw new BadRequestException('Unable to generate item attribute code.');
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

    if (user.companyId === companyId && user.permissions.includes(`${ItemAttributesModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage item attributes.');
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

    return user.companyId === companyId && user.permissions.includes(`${ItemAttributesModuleCode}:${action}`);
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
        throw new ConflictException('An item attribute with this code already exists.');
      }
      throw new ConflictException('An item attribute with this name already exists.');
    }
  }
}
