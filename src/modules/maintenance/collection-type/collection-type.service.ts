import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountStatus,
  ChartAccountType,
  DefaultAccount,
  DefaultAccountTemplateType,
  Prisma,
  ServiceAccountSetupMode,
} from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { generateNextAccountCodeFromSiblings } from '../chart-of-accounts/utils/chart-account-code.util';
import {
  accountGroupHasTag,
  findSystemAccountGroupOrThrow,
  mergeAccountGroupTags,
  SystemAccountGroups,
  SystemAccountGroupTags,
} from '../chart-of-accounts/utils/system-account-groups.util';
import { CollectionTypeOptionQueryDto } from './dto/collection-type-option-query.dto';
import { CreateCollectionTypeTemplateDto } from './dto/create-collection-type-template.dto';
import { GetCollectionTypeTemplateListQueryDto } from './dto/get-collection-type-template-list-query.dto';
import { UpdateCollectionTypeTemplateStatusDto } from './dto/update-collection-type-template-status.dto';
import { UpdateCollectionTypeTemplateDto } from './dto/update-collection-type-template.dto';
import { mapCollectionType } from './mappers/collection-type-template.mapper';
import { CollectionTypeInclude } from './prisma/collection-type-template.include';
import type { CollectionTypeParentRole, CollectionTypePayload, GeneratedAccountRequest } from './types/collection-type.type';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
const SupportedCollectionTypeTemplateTypes = [DefaultAccountTemplateType.COLLECTION] as const;
export const CollectionTypeModuleCode = 'CTM';

type CollectionTypeMaintenanceContext = {
  moduleCode: string;
  type: DefaultAccountTemplateType;
  label: string;
};

@Injectable()
export class CollectionTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetCollectionTypeTemplateListQueryDto, context: CollectionTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.VIEW, `You do not have permission to view ${label}.`);
    const scopedQuery = { ...query, ...(context.type ? { type: context.type } : {}) };
    this.ensureSupportedDefaultAccountType(scopedQuery.type);

    const page = scopedQuery.page ?? DefaultPage;
    const limit = scopedQuery.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, scopedQuery);
    const orderBy = this.buildOrderBy(scopedQuery);

    const [defaultAccounts, total, statistics] = await Promise.all([
      this.prisma.defaultAccount.findMany({
        where,
        include: CollectionTypeInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.defaultAccount.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      defaultAccounts: await this.mapCollectionTypesWithAuditUsers(defaultAccounts),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: getModulePermissions(user, companyId, moduleCode, { includeCancel: true, includeImport: true }),
    };
  }

  async findOne(user: AuthUser, id: string, context: CollectionTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.VIEW, `You do not have permission to view ${label}.`);
    const template = await this.findTemplateOrThrow(companyId, parsePositiveBigIntId(id), context.type);

    return {
      defaultAccount: (await this.mapCollectionTypesWithAuditUsers([template]))[0],
      permissions: getModulePermissions(user, companyId, moduleCode, { includeCancel: true, includeImport: true }),
    };
  }

  async findCollectionOptions(user: AuthUser, query: CollectionTypeOptionQueryDto) {
    const companyId = await this.ensureDefaultAccountOptionAccess(user);

    return {
      options: await this.findDefaultAccountOptions(companyId, query, DefaultAccountTemplateType.COLLECTION),
    };
  }

  async findAccountOptions(user: AuthUser, context: CollectionTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.VIEW, `You do not have permission to view ${label}.`);

    return {
      accounts: (await this.findSelectableRevenueAccounts(companyId, this.prisma)).map((account) => ({
        id: account.id.toString(),
        accountNumber: account.accountCode,
        accountName: account.accountTitle,
        accountType: account.accountType,
        statementGroup: 'Income Statement',
        statementSection: account.statementSection ?? 'Revenues',
        normalBalance: account.accountNature === AccountNature.CREDIT ? 'Credit' : 'Debit',
        accountCategory: 'Detail',
        description: account.description ?? account.accountTitle,
        status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
      })),
    };
  }

  async create(user: AuthUser, dto: CreateCollectionTypeTemplateDto, context: CollectionTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.CREATE, `You do not have permission to add ${label}.`);
    const scopedDto = { ...dto, ...(context.type ? { type: context.type } : {}) };
    const defaultAccountName = this.validateDefaultAccountName(dto.defaultAccountName);
    const description = this.normalizeTemplateDescription(dto.description);
    const accountSetupMode = dto.accountSetupMode ?? ServiceAccountSetupMode.AUTO;
    this.ensureSupportedDefaultAccountType(scopedDto.type);
    this.validateAccountSetup(dto, accountSetupMode, { requireExistingAccount: true });
    await this.ensureDefaultAccountNameAvailable(companyId, scopedDto.type, defaultAccountName);

    try {
      const template = await this.prisma.$transaction(async (tx) => {
        const requestedStatus = dto.status ?? ChartAccountStatus.ACTIVE;
        const generatedAccounts =
          accountSetupMode === ServiceAccountSetupMode.EXISTING
            ? {
                revenueCoaId: (await this.findSelectableRevenueAccountOrThrow(companyId, parsePositiveBigIntId(dto.revenueCoaId ?? '', 'revenueCoaId'), tx)).id,
              }
            : await this.createGeneratedAccounts({
                companyId,
                description: defaultAccountName,
                type: scopedDto.type,
                status: requestedStatus,
                tx,
                userId: user.id,
              });

        return tx.defaultAccount.create({
          data: {
            companyId,
            type: scopedDto.type,
            name: defaultAccountName,
            description,
            status: requestedStatus,
            accountSetupMode,
            expenseCoaId: generatedAccounts.expenseCoaId,
            revenueCoaId: generatedAccounts.revenueCoaId,
            createdByUserId: user.id,
          },
          include: CollectionTypeInclude,
        });
      }, MaintenanceTransactionOptions);

      const mappedAccount = (await this.mapCollectionTypesWithAuditUsers([template]))[0];
      const firstGenerated = mappedAccount.generatedAccounts?.[0];
      const message = firstGenerated
        ? `Collection type created successfully. Saved with Account Code - Account Title: ${firstGenerated.accountCode} - ${firstGenerated.accountTitle}.`
        : 'Collection type created successfully.';

      return {
        message,
        defaultAccount: mappedAccount,
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'Collection Type Name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateCollectionTypeTemplateDto, context: CollectionTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.UPDATE, `You do not have permission to edit ${label}.`);
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(companyId, templateId, context.type);
    const scopedDto = { ...dto, ...(context.type ? { type: context.type } : {}) };
    this.ensureSupportedDefaultAccountType(scopedDto.type);
    const nextSetupMode = dto.accountSetupMode ?? currentTemplate.accountSetupMode;
    this.validateAccountSetup(dto, nextSetupMode);

    if (scopedDto.type !== undefined && scopedDto.type !== currentTemplate.type) {
      throw new BadRequestException('Collection type cannot be changed.');
    }

    const defaultAccountName = dto.defaultAccountName === undefined ? currentTemplate.name : this.validateDefaultAccountName(dto.defaultAccountName);
    const description = dto.description === undefined ? currentTemplate.description : this.normalizeTemplateDescription(dto.description);

    if (defaultAccountName !== currentTemplate.name) {
      await this.ensureDefaultAccountNameAvailable(companyId, currentTemplate.type, defaultAccountName, templateId);
    }

    if (dto.status !== undefined && dto.status !== currentTemplate.status) {
      ensureModuleAction(user, companyId, moduleCode, PermissionAction.CANCEL, `You do not have permission to inactivate ${label}.`);
    }

    try {
      const template = await this.prisma.$transaction(async (tx) => {
        let revenueCoaId: bigint | undefined;

        if (nextSetupMode === ServiceAccountSetupMode.EXISTING) {
          if (currentTemplate.accountSetupMode === ServiceAccountSetupMode.AUTO && dto.revenueCoaId === undefined) {
            throw new BadRequestException('Select an existing account before changing account setup.');
          }

          const revenueAccount =
            dto.revenueCoaId !== undefined
              ? await this.findSelectableRevenueAccountOrThrow(companyId, parsePositiveBigIntId(dto.revenueCoaId ?? '', 'revenueCoaId'), tx)
              : await this.findSelectableRevenueAccountOrThrow(companyId, currentTemplate.revenueCoaId ?? 0n, tx);

          revenueCoaId = revenueAccount.id;
        }

        if (nextSetupMode === ServiceAccountSetupMode.AUTO) {
          if (currentTemplate.accountSetupMode === ServiceAccountSetupMode.AUTO && currentTemplate.revenueCoaId) {
            revenueCoaId = currentTemplate.revenueCoaId;
            await this.updateChartAccountTitle(currentTemplate.revenueCoaId, defaultAccountName, tx, user.id);
          } else {
            revenueCoaId = (
              await this.createGeneratedChartAccount({
                companyId,
                role: 'REVENUE_PARENT',
                resultKey: 'revenueCoaId',
                title: defaultAccountName,
                accountLevel: ChartAccountLevel.SPECIFIC,
                accountType: ChartAccountType.REVENUE,
                accountNature: AccountNature.CREDIT,
                accountGroup: [SystemAccountGroupTags.revenue, SystemAccountGroupTags.defaultAccountRevenueParent],
                isPostingAccount: true,
                status: dto.status ?? currentTemplate.status,
                tx,
                userId: user.id,
              })
            ).id;
          }
        }

        if (
          currentTemplate.accountSetupMode === ServiceAccountSetupMode.AUTO &&
          nextSetupMode === ServiceAccountSetupMode.EXISTING &&
          currentTemplate.revenueCoaId
        ) {
          await tx.chartAccount.update({
            where: { id: currentTemplate.revenueCoaId },
            data: {
              status: ChartAccountStatus.INACTIVE,
              deletedAt: new Date(),
              whoModified: String(user.id),
            },
          });
        }

        if (dto.status !== undefined && dto.status !== currentTemplate.status && nextSetupMode === ServiceAccountSetupMode.AUTO) {
          await this.updateLinkedChartAccountStatus(
            { ...currentTemplate, revenueCoaId: revenueCoaId ?? currentTemplate.revenueCoaId },
            dto.status,
            tx,
            user.id,
          );
        }

        return tx.defaultAccount.update({
          where: { id: templateId },
          data: {
            name: defaultAccountName,
            description,
            status: dto.status,
            accountSetupMode: nextSetupMode,
            revenueCoaId,
            updatedByUserId: user.id,
          },
          include: CollectionTypeInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Collection type updated successfully.',
        defaultAccount: (await this.mapCollectionTypesWithAuditUsers([template]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'Collection Type Name already exists.');
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateCollectionTypeTemplateStatusDto, context: CollectionTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.CANCEL, `You do not have permission to inactivate ${label}.`);
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(companyId, templateId, context.type);

    const template = await this.prisma.$transaction(async (tx) => {
      if (currentTemplate.accountSetupMode === ServiceAccountSetupMode.AUTO) {
        await this.updateLinkedChartAccountStatus(currentTemplate, dto.status, tx, user.id);
      }

      return tx.defaultAccount.update({
        where: { id: templateId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: CollectionTypeInclude,
      });
    }, MaintenanceTransactionOptions);

    return {
      message: dto.status === ChartAccountStatus.ACTIVE ? 'Collection type activated successfully.' : 'Collection type inactivated successfully.',
      defaultAccount: (await this.mapCollectionTypesWithAuditUsers([template]))[0],
    };
  }

  private async mapCollectionTypesWithAuditUsers(defaultAccounts: Array<DefaultAccount | CollectionTypePayload>) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      defaultAccounts.flatMap((defaultAccount) => [defaultAccount.createdByUserId, defaultAccount.updatedByUserId]),
    );

    return defaultAccounts.map((defaultAccount) => mapCollectionType(defaultAccount as CollectionTypePayload, userNames));
  }

  private async ensureDefaultAccountOptionAccess(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return companyId;
  }

  private async findDefaultAccountOptions(companyId: number, query: CollectionTypeOptionQueryDto, type?: DefaultAccountTemplateType) {
    const where = this.buildDefaultAccountOptionWhere(companyId, query, type);
    const defaultAccounts = await this.prisma.defaultAccount.findMany({
      where,
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        status: true,
        revenueCoa: {
          select: {
            id: true,
            accountCode: true,
            accountTitle: true,
            accountType: true,
            accountNature: true,
          },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });

    return defaultAccounts.map((defaultAccount) => {
      const chartAccount = defaultAccount.revenueCoa;

      return {
        id: defaultAccount.id.toString(),
        type: defaultAccount.type,
        defaultAccountName: defaultAccount.name,
        description: defaultAccount.description ?? '',
        status: defaultAccount.status,
        chartAccountId: chartAccount?.id.toString() ?? null,
        accountCode: chartAccount?.accountCode ?? null,
        accountTitle: chartAccount?.accountTitle ?? null,
        accountType: chartAccount?.accountType ?? null,
        accountNature: chartAccount?.accountNature ?? null,
      };
    });
  }

  private buildDefaultAccountOptionWhere(
    companyId: number,
    query: CollectionTypeOptionQueryDto,
    type?: DefaultAccountTemplateType,
  ): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      type: type ?? DefaultAccountTemplateType.COLLECTION,
      status: query.status ?? ChartAccountStatus.ACTIVE,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { revenueCoa: { accountCode: { contains: search, mode: 'insensitive' } } },
              { revenueCoa: { accountTitle: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildListWhere(companyId: number, query: GetCollectionTypeTemplateListQueryDto): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(!query.type ? { type: { in: [...SupportedCollectionTypeTemplateTypes] } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              {
                revenueCoa: {
                  accountCode: { contains: search, mode: 'insensitive' },
                },
              },
              {
                assetCoa: {
                  accountCode: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetCollectionTypeTemplateListQueryDto): Prisma.DefaultAccountOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private async getStatistics(companyId: number) {
    const groups = await this.prisma.defaultAccount.groupBy({
      by: ['status', 'type'],
      where: { companyId, deletedAt: null },
      _count: { _all: true },
    });

    return {
      totalDefaultAccounts: groups.reduce((total, group) => total + group._count._all, 0),
      activeDefaultAccounts: groups.filter((group) => group.status === ChartAccountStatus.ACTIVE).reduce((total, group) => total + group._count._all, 0),
      inactiveDefaultAccounts: groups.filter((group) => group.status === ChartAccountStatus.INACTIVE).reduce((total, group) => total + group._count._all, 0),
      expenseDefaultAccounts: groups.find((group) => group.type === DefaultAccountTemplateType.EXPENSE)?._count._all ?? 0,
      collectionDefaultAccounts: groups.find((group) => group.type === DefaultAccountTemplateType.COLLECTION)?._count._all ?? 0,
    };
  }

  private async createGeneratedAccounts({
    companyId,
    description,
    type,
    status,
    tx,
    userId,
  }: {
    companyId: number;
    description: string;
    type: DefaultAccountTemplateType;
    status: ChartAccountStatus;
    tx: Prisma.TransactionClient;
    userId: number;
  }) {
    const result: {
      expenseCoaId?: bigint;
      revenueCoaId?: bigint;
    } = {};
    for (const account of this.getGeneratedAccountRequests(type, description)) {
      const chartAccount = await this.createGeneratedChartAccount({
        companyId,
        status,
        tx,
        userId,
        parentAccount: account.selectedParentAccount,
        ...account,
      });

      if (account.resultKey) {
        result[account.resultKey] = chartAccount.id;
      }
    }

    return result;
  }

  private getGeneratedAccountRequests(type: DefaultAccountTemplateType, description: string): GeneratedAccountRequest[] {
    if (type === DefaultAccountTemplateType.COLLECTION) {
      return [
        {
          role: 'REVENUE_PARENT',
          resultKey: 'revenueCoaId',
          title: description,
          accountLevel: ChartAccountLevel.SPECIFIC,
          accountType: ChartAccountType.REVENUE,
          accountNature: AccountNature.CREDIT,
          accountGroup: [SystemAccountGroupTags.revenue, SystemAccountGroupTags.defaultAccountRevenueParent],
          isPostingAccount: true,
        },
      ];
    }

    throw new BadRequestException('Collection type must be Collection.');
  }

  private async createGeneratedChartAccount({
    companyId,
    role,
    title,
    accountType,
    accountNature,
    accountGroup,
    accountLevel,
    isPostingAccount,
    status,
    tx,
    userId,
    parentAccount: providedParentAccount,
  }: GeneratedAccountRequest & {
    companyId: number;
    status: ChartAccountStatus;
    tx: Prisma.TransactionClient;
    userId: number;
    parentAccount?: {
      id: bigint;
      accountCode: string;
    };
  }) {
    const parentAccount = providedParentAccount ?? (await this.findMappedParentOrThrow(companyId, role, tx));
    const accountCode = await this.generateNextAccountCode(companyId, parentAccount.id, parentAccount.accountCode, accountLevel, tx);

    return tx.chartAccount.create({
      data: {
        companyId,
        parentAccountId: parentAccount.id,
        accountCode,
        accountTitle: title,
        accountLevel,
        accountType,
        accountNature,
        accountGroup: mergeAccountGroupTags(accountGroup),
        isPostingAccount,
        status,
        deletedAt: status === ChartAccountStatus.INACTIVE ? new Date() : null,
        whoCreated: String(userId),
      },
    });
  }

  private async findSelectableRevenueAccounts(companyId: number, tx: Prisma.TransactionClient | PrismaService) {
    return tx.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountType: true,
        accountNature: true,
        accountGroup: true,
        statementSection: true,
        description: true,
        status: true,
      },
      orderBy: [{ accountCode: 'asc' }, { id: 'asc' }],
    });
  }

  private async findSelectableRevenueAccountOrThrow(companyId: number, accountId: bigint, tx: Prisma.TransactionClient | PrismaService) {
    const account = await tx.chartAccount.findFirst({
      where: {
        id: accountId,
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
      select: { id: true, accountGroup: true },
    });

    if (!account) {
      throw new BadRequestException('Select an active posting account.');
    }

    return account;
  }

  private async findMappedParentOrThrow(companyId: number, accountRole: CollectionTypeParentRole, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const definition = getDefaultAccountParentDefinition(accountRole);

    return findSystemAccountGroupOrThrow(tx, companyId, definition);
  }

  private async generateNextAccountCode(
    companyId: number,
    parentAccountId: bigint,
    parentAccountCode: string,
    accountLevel: ChartAccountLevel,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    const siblings = await tx.chartAccount.findMany({
      where: {
        companyId,
        parentAccountId,
        accountLevel,
      },
      select: { accountCode: true },
      orderBy: { accountCode: 'asc' },
    });

    return generateNextAccountCodeFromSiblings({
      parentCode: parentAccountCode,
      accountLevel,
      siblingCodes: siblings.map((sibling) => sibling.accountCode),
    });
  }

  private async updateGeneratedAccountTitles({
    description,
    template,
    tx,
    userId,
  }: {
    description: string;
    template: Awaited<ReturnType<CollectionTypeService['findTemplateOrThrow']>>;
    tx: Prisma.TransactionClient;
    userId: number;
  }) {
    if (template.type === DefaultAccountTemplateType.COLLECTION) {
      await this.updateChartAccountTitle(template.revenueCoaId, description, tx, userId);
      return;
    }

    throw new BadRequestException('Collection type must be Collection.');
  }

  private async updateChartAccountTitle(chartAccountId: bigint | null, accountTitle: string, tx: Prisma.TransactionClient, userId: number) {
    if (!chartAccountId) {
      return;
    }

    await tx.chartAccount.update({
      where: { id: chartAccountId },
      data: { accountTitle, whoModified: String(userId) },
    });
  }

  private async updateLinkedChartAccountStatus(
    template: Awaited<ReturnType<CollectionTypeService['findTemplateOrThrow']>>,
    status: ChartAccountStatus,
    tx: Prisma.TransactionClient,
    userId: number,
  ) {
    const chartAccountIds = [template.revenueCoaId].filter((id): id is bigint => Boolean(id));

    if (chartAccountIds.length === 0) {
      return;
    }

    await tx.chartAccount.updateMany({
      where: { id: { in: chartAccountIds }, companyId: template.companyId },
      data: {
        status,
        deletedAt: status === ChartAccountStatus.INACTIVE ? new Date() : null,
        whoModified: String(userId),
      },
    });
  }

  private validateDefaultAccountName(value: string | undefined) {
    const description = value?.trim();

    if (!description) {
      throw new BadRequestException('Collection Type Name is required.');
    }

    return description;
  }

  private normalizeTemplateDescription(value: string | undefined) {
    const description = value?.trim();
    return description ? description : null;
  }

  private validateAccountSetup(
    dto: CreateCollectionTypeTemplateDto | UpdateCollectionTypeTemplateDto,
    accountSetupMode: ServiceAccountSetupMode,
    options: { requireExistingAccount?: boolean } = {},
  ) {
    if (
      accountSetupMode === ServiceAccountSetupMode.EXISTING &&
      (options.requireExistingAccount || dto.revenueCoaId !== undefined) &&
      !dto.revenueCoaId?.trim()
    ) {
      throw new BadRequestException('Account is required when selecting an existing account.');
    }
  }

  private ensureSupportedDefaultAccountType(type: DefaultAccountTemplateType | undefined) {
    if (type && !SupportedCollectionTypeTemplateTypes.includes(type as (typeof SupportedCollectionTypeTemplateTypes)[number])) {
      throw new BadRequestException('Collection type must be Collection.');
    }
  }

  private async ensureDefaultAccountNameAvailable(companyId: number, type: DefaultAccountTemplateType, description: string, excludedTemplateId?: bigint) {
    const existingTemplate = await this.prisma.defaultAccount.findFirst({
      where: {
        companyId,
        type,
        deletedAt: null,
        id: excludedTemplateId ? { not: excludedTemplateId } : undefined,
        name: { equals: description, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingTemplate) {
      throw new ConflictException('Collection Type Name already exists.');
    }
  }

  private async findTemplateOrThrow(companyId: number, templateId: bigint, type?: DefaultAccountTemplateType) {
    const template = await this.prisma.defaultAccount.findFirst({
      where: { id: templateId, companyId, deletedAt: null, type: type ?? { in: [...SupportedCollectionTypeTemplateTypes] } },
      include: CollectionTypeInclude,
    });

    if (!template) {
      throw new NotFoundException('Collection type not found.');
    }

    return template;
  }
}

function getDefaultAccountParentDefinition(role: CollectionTypeParentRole) {
  if (role === 'REVENUE_PARENT') {
    return SystemAccountGroups.defaultAccount.revenueParent;
  }

  return SystemAccountGroups.defaultAccount.revenueParent;
}
