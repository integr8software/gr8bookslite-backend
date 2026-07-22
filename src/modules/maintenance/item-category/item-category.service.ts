import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCategory, ItemCategoryAccountingSetupMode, ItemCategoryStatus, MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { mapItemCategory } from './mappers/item-category.mapper';
import { ItemCategoryWithAccounts, ItemCategoryWithAccountsInclude } from './types/item-category-with-accounts.type';
import {
  ItemCategoryAccountingAccountIds,
  ItemCategoryAccountingRequirements,
  resolveItemCategoryAccountingAccounts,
} from './utils/item-category-accounting.util';

const ItemCategoryModuleCode = 'IC';

type ItemCategoryAccountingSetup = {
  inventoryAccount: string;
  salesAccount: string;
  costOfSalesAccount: string;
  expenseAccount: string;
};

type ItemCategoryEffectiveSetup = {
  accountingSetup: ItemCategoryAccountingSetup;
  inheritedAccountingSourceName: string | null;
};

@Injectable()
export class ItemCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const [categories, statistics] = await Promise.all([
      this.prisma.itemCategory.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        include: ItemCategoryWithAccountsInclude,
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
      this.getStatistics(companyId),
    ]);

    return {
      categories: await this.mapCategoriesWithAuditUsers(categories),
      permissions: this.getPermissions(user, companyId),
      statistics,
    };
  }

  async findOptions(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    const categories = await this.prisma.itemCategory.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ItemCategoryStatus.ACTIVE,
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        parentId: true,
        behaviors: true,
        allowSubCategory: true,
        status: true,
      },
    });

    return {
      categories: categories.map((category) => ({
        id: category.id.toString(),
        code: category.code,
        name: category.name,
        description: category.description,
        parentId: category.parentId?.toString() ?? null,
        behaviors: category.behaviors,
        allowSubCategory: category.allowSubCategory,
        status: category.status,
      })),
    };
  }

  async create(user: AuthUser, dto: CreateItemCategoryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    try {
      const category = await this.prisma.$transaction<ItemCategoryWithAccounts>(async (tx) => {
        const parentId = parseOptionalPositiveBigIntId(dto.parentId, 'parentId');
        const name = this.normalizeName(dto.name);
        const accountingSetupMode = dto.accountingSetupMode ?? ItemCategoryAccountingSetupMode.AUTO_CREATE;
        const accountingRequirements = this.getAccountingRequirements(dto);

        await this.validateParentSelection({
          companyId,
          parentId,
          tx,
        });
        this.assertRootAccountingMode(parentId, accountingSetupMode);
        await this.ensureNameAvailable(companyId, parentId, name, undefined, tx);
        const accountIds =
          accountingSetupMode === ItemCategoryAccountingSetupMode.AUTO_CREATE
            ? await resolveItemCategoryAccountingAccounts(tx, companyId, name, accountingRequirements)
            : {};
        const code = await this.createNextCode(tx, companyId);

        return tx.itemCategory.create({
          data: {
            companyId,
            parentId,
            code,
            name,
            description: this.normalizeDescription(dto.description),
            accountingSetupMode,
            ...accountingRequirements,
            behaviors: dto.behaviors ?? ['Sellable Item', 'Purchasable Item', 'Issuable Item', 'Returnable Item'],
            ...accountIds,
            allowSubCategory: dto.allowSubCategory,
            status: dto.status ?? ItemCategoryStatus.ACTIVE,
            createdByUserId: user.id,
          },
          include: ItemCategoryWithAccountsInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Item category created successfully.',
        category: (await this.mapCategoriesWithAuditUsers([category]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateItemCategoryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const categoryId = parsePositiveBigIntId(id);

    try {
      const category = await this.prisma.$transaction<ItemCategoryWithAccounts>(async (tx) => {
        const existing = await this.findCategoryOrThrow(companyId, categoryId, tx);
        const parentId = dto.parentId === undefined ? existing.parentId : parseOptionalPositiveBigIntId(dto.parentId, 'parentId');
        const name = dto.name === undefined ? existing.name : this.normalizeName(dto.name);
        const accountingSetupMode = dto.accountingSetupMode ?? existing.accountingSetupMode;
        const accountingRequirements = this.getAccountingRequirements(dto, existing);
        const nextStatus = dto.status ?? existing.status;

        await this.validateParentSelection({
          companyId,
          parentId,
          currentCategoryId: categoryId,
          tx,
        });
        this.assertRootAccountingMode(parentId, accountingSetupMode);
        await this.ensureNameAvailable(companyId, parentId, name, categoryId, tx);
        const accountIds =
          accountingSetupMode === ItemCategoryAccountingSetupMode.AUTO_CREATE
            ? await resolveItemCategoryAccountingAccounts(
                tx,
                companyId,
                name,
                accountingRequirements,
                this.getPreservedAccountingAccountIds(existing, accountingRequirements),
              )
            : {};

        await tx.itemCategory.update({
          where: { id: categoryId },
          data: {
            ...(dto.name !== undefined ? { name } : {}),
            ...(dto.description !== undefined ? { description: this.normalizeDescription(dto.description) } : {}),
            ...(dto.parentId !== undefined ? { parentId } : {}),
            ...(dto.accountingSetupMode !== undefined ? { accountingSetupMode } : {}),
            ...accountingRequirements,
            ...(dto.behaviors !== undefined ? { behaviors: dto.behaviors } : {}),
            ...accountIds,
            ...(dto.allowSubCategory !== undefined ? { allowSubCategory: dto.allowSubCategory } : {}),
            ...(dto.status !== undefined ? { status: nextStatus } : {}),
            updatedByUserId: user.id,
          },
        });

        if (dto.status !== undefined && dto.status !== existing.status) {
          await this.syncDescendantStatus(tx, companyId, categoryId, dto.status);
        }

        return tx.itemCategory.findUniqueOrThrow({
          where: { id: categoryId },
          include: ItemCategoryWithAccountsInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Item category updated successfully.',
        category: (await this.mapCategoriesWithAuditUsers([category]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  private async findCategoryOrThrow(companyId: number, categoryId: bigint, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const category = await tx.itemCategory.findFirst({
      where: {
        id: categoryId,
        companyId,
        deletedAt: null,
      },
      include: ItemCategoryWithAccountsInclude,
    });

    if (!category) {
      throw new NotFoundException('Item category not found.');
    }

    return category;
  }

  private async validateParentSelection({
    companyId,
    currentCategoryId,
    parentId,
    tx,
  }: {
    companyId: number;
    currentCategoryId?: bigint;
    parentId: bigint | null;
    tx: Prisma.TransactionClient;
  }) {
    if (!parentId) {
      return;
    }

    if (currentCategoryId && parentId === currentCategoryId) {
      throw new BadRequestException('A category cannot be its own parent.');
    }

    const parent = await tx.itemCategory.findFirst({
      where: {
        id: parentId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        parentId: true,
        allowSubCategory: true,
        status: true,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent category not found.');
    }

    if (parent.status !== ItemCategoryStatus.ACTIVE) {
      throw new BadRequestException('Choose an active parent category.');
    }

    if (!parent.allowSubCategory) {
      throw new BadRequestException('This parent does not allow subcategories.');
    }

    if (currentCategoryId && (await this.isCircularParentSelection(tx, companyId, currentCategoryId, parentId))) {
      throw new BadRequestException('Choose a parent outside this category branch.');
    }
  }

  private async isCircularParentSelection(tx: Prisma.TransactionClient, companyId: number, categoryId: bigint, parentId: bigint) {
    let currentParentId: bigint | null = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }

      const key = currentParentId.toString();

      if (visited.has(key)) {
        return true;
      }

      visited.add(key);
      const parent: { parentId: bigint | null } | null = await tx.itemCategory.findFirst({
        where: {
          id: currentParentId,
          companyId,
          deletedAt: null,
        },
        select: {
          parentId: true,
        },
      });

      currentParentId = parent?.parentId ?? null;
    }

    return false;
  }

  private assertRootAccountingMode(parentId: bigint | null, accountingSetupMode: ItemCategoryAccountingSetupMode) {
    if (!parentId && accountingSetupMode === ItemCategoryAccountingSetupMode.INHERIT) {
      throw new BadRequestException('Root categories must auto-create item accounts.');
    }
  }

  private getAccountingRequirements(
    dto: Pick<CreateItemCategoryDto, 'requiresInventoryAccount' | 'requiresSalesAccount' | 'requiresCostOfSalesAccount' | 'requiresExpenseAccount'>,
    existing?: ItemCategory,
  ): ItemCategoryAccountingRequirements {
    const requirements = {
      requiresInventoryAccount: dto.requiresInventoryAccount ?? existing?.requiresInventoryAccount ?? true,
      requiresSalesAccount: dto.requiresSalesAccount ?? existing?.requiresSalesAccount ?? true,
      requiresCostOfSalesAccount: dto.requiresCostOfSalesAccount ?? existing?.requiresCostOfSalesAccount ?? true,
      requiresExpenseAccount: dto.requiresExpenseAccount ?? existing?.requiresExpenseAccount ?? true,
    };

    if (!Object.values(requirements).some(Boolean)) {
      throw new BadRequestException('Select at least one required item category account.');
    }

    return requirements;
  }

  private getPreservedAccountingAccountIds(existing: ItemCategory, requirements: ItemCategoryAccountingRequirements): ItemCategoryAccountingAccountIds {
    const preserveInheritedAccounts = existing.accountingSetupMode === ItemCategoryAccountingSetupMode.INHERIT;

    return {
      inventoryAccountId:
        !requirements.requiresInventoryAccount || !existing.requiresInventoryAccount || preserveInheritedAccounts
          ? (existing.inventoryAccountId ?? undefined)
          : undefined,
      salesAccountId:
        !requirements.requiresSalesAccount || !existing.requiresSalesAccount || preserveInheritedAccounts ? (existing.salesAccountId ?? undefined) : undefined,
      costOfSalesAccountId:
        !requirements.requiresCostOfSalesAccount || !existing.requiresCostOfSalesAccount || preserveInheritedAccounts
          ? (existing.costOfSalesAccountId ?? undefined)
          : undefined,
      expenseAccountId:
        !requirements.requiresExpenseAccount || !existing.requiresExpenseAccount || preserveInheritedAccounts
          ? (existing.expenseAccountId ?? undefined)
          : undefined,
    };
  }

  private async ensureNameAvailable(
    companyId: number,
    parentId: bigint | null,
    name: string,
    excludedCategoryId?: bigint,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (!name) {
      throw new BadRequestException('Item category name is required.');
    }

    const existingCategory = await tx.itemCategory.findFirst({
      where: {
        companyId,
        parentId,
        deletedAt: null,
        id: excludedCategoryId ? { not: excludedCategoryId } : undefined,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCategory) {
      throw new ConflictException('A category with this name already exists under this parent.');
    }
  }

  private async syncDescendantStatus(tx: Prisma.TransactionClient, companyId: number, categoryId: bigint, status: ItemCategoryStatus) {
    const descendants = await this.collectDescendants(tx, companyId, categoryId);

    for (const descendant of descendants) {
      if (status === ItemCategoryStatus.INACTIVE) {
        await tx.itemCategory.update({
          where: { id: descendant.id },
          data: {
            statusBeforeParentInactive: descendant.statusBeforeParentInactive ?? descendant.status,
            parentInactiveSourceIds: this.addParentInactiveSource(descendant.parentInactiveSourceIds, categoryId),
            status: ItemCategoryStatus.INACTIVE,
          },
        });
        continue;
      }

      const sourceIds = this.removeParentInactiveSource(descendant.parentInactiveSourceIds, categoryId);

      await tx.itemCategory.update({
        where: { id: descendant.id },
        data:
          sourceIds.length > 0
            ? {
                parentInactiveSourceIds: sourceIds,
                status: ItemCategoryStatus.INACTIVE,
              }
            : {
                parentInactiveSourceIds: Prisma.DbNull,
                statusBeforeParentInactive: null,
                status: descendant.statusBeforeParentInactive ?? ItemCategoryStatus.ACTIVE,
              },
      });
    }
  }

  private async collectDescendants(tx: Prisma.TransactionClient, companyId: number, categoryId: bigint) {
    const descendants: ItemCategory[] = [];
    const pending = [categoryId];
    const visited = new Set<string>();

    while (pending.length > 0) {
      const parentId = pending.shift();

      if (!parentId || visited.has(parentId.toString())) {
        continue;
      }

      visited.add(parentId.toString());
      const children = await tx.itemCategory.findMany({
        where: {
          companyId,
          parentId,
          deletedAt: null,
        },
      });

      descendants.push(...children);
      pending.push(...children.map((child) => child.id));
    }

    return descendants;
  }

  private addParentInactiveSource(value: Prisma.JsonValue | null, categoryId: bigint) {
    return Array.from(new Set([...this.parseParentInactiveSourceIds(value), categoryId.toString()]));
  }

  private removeParentInactiveSource(value: Prisma.JsonValue | null, categoryId: bigint) {
    return this.parseParentInactiveSourceIds(value).filter((sourceId) => sourceId !== categoryId.toString());
  }

  private parseParentInactiveSourceIds(value: Prisma.JsonValue | null) {
    return Array.isArray(value) ? value.flatMap((item) => (typeof item === 'string' ? [item] : [])) : [];
  }

  private async mapCategoriesWithAuditUsers(categories: ItemCategoryWithAccounts[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      categories.flatMap((category) => [category.createdByUserId, category.updatedByUserId]),
    );
    const effectiveSetupById = this.resolveEffectiveAccountingSetups(categories);

    return categories.map((category) => {
      const effective = effectiveSetupById.get(category.id.toString());

      return mapItemCategory(
        category,
        userNames,
        effective?.accountingSetup ?? this.createEmptyAccountingSetup(),
        effective?.inheritedAccountingSourceName ?? null,
      );
    });
  }

  private resolveEffectiveAccountingSetups(categories: ItemCategoryWithAccounts[]) {
    const categoryById = new Map(categories.map((category) => [category.id.toString(), category]));
    const setupById = new Map<string, ItemCategoryEffectiveSetup>();

    const resolve = (category: ItemCategoryWithAccounts, path = new Set<string>()): ItemCategoryEffectiveSetup => {
      const categoryId = category.id.toString();
      const existing = setupById.get(categoryId);

      if (existing) {
        return existing;
      }

      if (path.has(categoryId)) {
        return {
          accountingSetup: this.createEmptyAccountingSetup(),
          inheritedAccountingSourceName: null,
        };
      }

      if (category.accountingSetupMode === ItemCategoryAccountingSetupMode.AUTO_CREATE) {
        const setup = {
          accountingSetup: this.applyAccountingRequirements(
            {
              inventoryAccount: category.inventoryAccount?.accountTitle ?? '',
              salesAccount: category.salesAccount?.accountTitle ?? '',
              costOfSalesAccount: category.costOfSalesAccount?.accountTitle ?? '',
              expenseAccount: category.expenseAccount?.accountTitle ?? '',
            },
            category,
          ),
          inheritedAccountingSourceName: null,
        };

        setupById.set(categoryId, setup);
        return setup;
      }

      const parent = category.parentId ? categoryById.get(category.parentId.toString()) : undefined;
      const parentSetup = parent
        ? resolve(parent, new Set([...path, categoryId]))
        : { accountingSetup: this.createEmptyAccountingSetup(), inheritedAccountingSourceName: null };
      const setup = {
        accountingSetup: this.applyAccountingRequirements(parentSetup.accountingSetup, category),
        inheritedAccountingSourceName: parent?.name ?? parentSetup.inheritedAccountingSourceName,
      };

      setupById.set(categoryId, setup);
      return setup;
    };

    categories.forEach((category) => resolve(category));
    return setupById;
  }

  private applyAccountingRequirements(
    accountingSetup: ItemCategoryAccountingSetup,
    requirements: ItemCategoryAccountingRequirements,
  ): ItemCategoryAccountingSetup {
    return {
      inventoryAccount: requirements.requiresInventoryAccount ? accountingSetup.inventoryAccount : '',
      salesAccount: requirements.requiresSalesAccount ? accountingSetup.salesAccount : '',
      costOfSalesAccount: requirements.requiresCostOfSalesAccount ? accountingSetup.costOfSalesAccount : '',
      expenseAccount: requirements.requiresExpenseAccount ? accountingSetup.expenseAccount : '',
    };
  }

  private createEmptyAccountingSetup(): ItemCategoryAccountingSetup {
    return {
      inventoryAccount: '',
      salesAccount: '',
      costOfSalesAccount: '',
      expenseAccount: '',
    };
  }

  private async getStatistics(companyId: number) {
    const groups = await this.prisma.itemCategory.groupBy({
      by: ['status', 'accountingSetupMode', 'allowSubCategory'],
      where: {
        companyId,
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    });
    const statistics = {
      totalCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      configuredCount: 0,
      inheritedCount: 0,
      subcategoryLockedCount: 0,
    };

    for (const group of groups) {
      const count = group._count._all;

      statistics.totalCount += count;
      if (group.status === ItemCategoryStatus.ACTIVE) statistics.activeCount += count;
      if (group.status === ItemCategoryStatus.INACTIVE) statistics.inactiveCount += count;
      if (group.accountingSetupMode === ItemCategoryAccountingSetupMode.AUTO_CREATE) statistics.configuredCount += count;
      if (group.accountingSetupMode === ItemCategoryAccountingSetupMode.INHERIT) statistics.inheritedCount += count;
      if (!group.allowSubCategory) statistics.subcategoryLockedCount += count;
    }

    return statistics;
  }

  private normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeDescription(description: string | null | undefined) {
    return description?.trim() ?? '';
  }

  private async createNextCode(tx: Prisma.TransactionClient, companyId: number) {
    const existingCategories = await tx.itemCategory.findMany({
      where: { companyId },
      select: { code: true },
    });
    const usedCodes = new Set(existingCategories.map((category) => category.code));
    let nextNumber = existingCategories.reduce((max, category) => {
      const match = /^IC-(\d+)$/.exec(category.code);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    do {
      nextNumber += 1;
      const code = `IC-${nextNumber.toString().padStart(3, '0')}`;
      if (!usedCodes.has(code)) {
        return code;
      }
    } while (nextNumber < 999999);

    throw new BadRequestException('Unable to generate item category code.');
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

    if (user.companyId === companyId && user.permissions.includes(`${ItemCategoryModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage item categories.');
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return user.companyId === companyId && user.permissions.includes(`${ItemCategoryModuleCode}:${action}`);
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
        throw new ConflictException('An item category with this code already exists.');
      }

      throw new ConflictException('A category with this name already exists under this parent.');
    }
  }
}
