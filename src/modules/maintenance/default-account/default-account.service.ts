import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, DefaultAccount, DefaultAccountTemplateType, Prisma } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateChartAccountDto } from '../chart-of-accounts/dto/create-chart-account.dto';
import { assertCanCreateAccountLevel, generateNextAccountCodeFromSiblings } from '../chart-of-accounts/utils/chart-account-code.util';
import { findSystemAccountGroupOrThrow, mergeAccountGroupTags, SystemAccountGroups } from '../chart-of-accounts/utils/system-account-groups.util';
import { CreateDefaultAccountTemplateDto } from './dto/create-default-account-template.dto';
import { GetDefaultAccountTemplateListQueryDto } from './dto/get-default-account-template-list-query.dto';
import { UpdateDefaultAccountTemplateStatusDto } from './dto/update-default-account-template-status.dto';
import { UpdateDefaultAccountTemplateDto } from './dto/update-default-account-template.dto';
import { DefaultAccountLookupService } from './lookups/default-account-lookup.service';
import { mapDefaultAccount } from './mappers/default-account-template.mapper';
import { DefaultAccountInclude } from './prisma/default-account-template.include';
import type { DefaultAccountParentRole, DefaultAccountPayload, GeneratedAccountRequest, ParentChartAccountReference } from './types/default-account.type';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
const SupportedDefaultAccountTemplateTypes = [DefaultAccountTemplateType.EXPENSE, DefaultAccountTemplateType.COLLECTION] as const;

@Injectable()
export class DefaultAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultAccountLookupService: DefaultAccountLookupService,
  ) {}

  async findAll(user: AuthUser, query: GetDefaultAccountTemplateListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.VIEW, 'You do not have permission to view default accounts.');
    this.ensureSupportedDefaultAccountType(query.type);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [defaultAccounts, total, statistics] = await Promise.all([
      this.prisma.defaultAccount.findMany({
        where,
        include: DefaultAccountInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.defaultAccount.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      defaultAccounts: await this.mapDefaultAccountsWithAuditUsers(defaultAccounts),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: getModulePermissions(user, companyId, 'DA', { includeCancel: true }),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.VIEW, 'You do not have permission to view default accounts.');
    const template = await this.findTemplateOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      defaultAccount: (await this.mapDefaultAccountsWithAuditUsers([template]))[0],
      permissions: getModulePermissions(user, companyId, 'DA', { includeCancel: true }),
    };
  }

  async findExpenseParentOptions(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.VIEW, 'You do not have permission to view default accounts.');

    return {
      options: await this.defaultAccountLookupService.findExpenseParentOptions({ companyId }),
    };
  }

  async createExpenseSubAccount(user: AuthUser, dto: CreateChartAccountDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.CREATE, 'You do not have permission to add default account expense types.');

    if (!dto.parentAccountId) {
      throw new BadRequestException('Select an expense parent before adding a sub account.');
    }

    const parentAccountId = parsePositiveBigIntId(dto.parentAccountId, 'parentAccountId');
    const parentAccount = await this.findExpenseParentOptionOrThrow(companyId, parentAccountId, this.prisma);
    assertCanCreateAccountLevel(parentAccount.accountLevel, dto.accountLevel);

    const accountTitle = this.validateDefaultAccountName(dto.accountTitle);
    await this.ensureChartAccountTitleAvailable(companyId, parentAccount.id, accountTitle);

    try {
      const account = await this.prisma.chartAccount.create({
        data: {
          accountCode: await this.generateNextAccountCode(companyId, parentAccount.id, parentAccount.accountCode, dto.accountLevel, this.prisma),
          accountGroup: mergeAccountGroupTags(dto.accountGroup ?? 'Expenses'),
          accountLevel: dto.accountLevel,
          accountNature: dto.accountNature ?? AccountNature.DEBIT,
          accountTitle,
          accountType: dto.accountType ?? ChartAccountType.EXPENSE,
          companyId,
          deletedAt: dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
          description: this.normalizeTemplateDescription(dto.description),
          isPostingAccount: dto.isPostingAccount ?? false,
          parentAccountId: parentAccount.id,
          reportAlias: dto.reportAlias?.trim() || null,
          showTotal: dto.showTotal ?? false,
          statementSection: dto.statementSection?.trim() || null,
          status: dto.status ?? ChartAccountStatus.ACTIVE,
          whoCreated: String(user.id),
        },
      });

      return {
        message: 'Expense sub account created successfully.',
        account: {
          id: account.id.toString(),
        },
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'An expense sub account with this code already exists.');
      throw error;
    }
  }

  async create(user: AuthUser, dto: CreateDefaultAccountTemplateDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.CREATE, 'You do not have permission to add default accounts.');
    const defaultAccountName = this.validateDefaultAccountName(dto.defaultAccountName);
    const description = this.normalizeTemplateDescription(dto.description);
    this.ensureSupportedDefaultAccountType(dto.type);
    await this.ensureDefaultAccountNameAvailable(companyId, dto.type, defaultAccountName);

    try {
      const template = await this.prisma.$transaction(async (tx) => {
        const requestedStatus = dto.status ?? ChartAccountStatus.ACTIVE;
        const generatedAccounts = await this.createGeneratedAccounts({
          companyId,
          description: defaultAccountName,
          expenseParentCoaId: dto.expenseParentCoaId,
          type: dto.type,
          status: requestedStatus,
          tx,
          userId: user.id,
        });

        return tx.defaultAccount.create({
          data: {
            companyId,
            type: dto.type,
            name: defaultAccountName,
            description,
            status: requestedStatus,
            expenseCoaId: generatedAccounts.expenseCoaId,
            revenueCoaId: generatedAccounts.revenueCoaId,
            createdByUserId: user.id,
          },
          include: DefaultAccountInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Default account created successfully.',
        defaultAccount: (await this.mapDefaultAccountsWithAuditUsers([template]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'Default Account Name already exists for this type.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateDefaultAccountTemplateDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.UPDATE, 'You do not have permission to edit default accounts.');
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(companyId, templateId);
    this.ensureSupportedDefaultAccountType(dto.type);

    if (dto.type !== undefined && dto.type !== currentTemplate.type) {
      throw new BadRequestException('Default account type cannot be changed.');
    }

    const defaultAccountName = dto.defaultAccountName === undefined ? currentTemplate.name : this.validateDefaultAccountName(dto.defaultAccountName);
    const description = dto.description === undefined ? currentTemplate.description : this.normalizeTemplateDescription(dto.description);

    if (defaultAccountName !== currentTemplate.name) {
      await this.ensureDefaultAccountNameAvailable(companyId, currentTemplate.type, defaultAccountName, templateId);
    }

    if (dto.status !== undefined && dto.status !== currentTemplate.status) {
      ensureModuleAction(user, companyId, 'DA', PermissionAction.CANCEL, 'You do not have permission to inactivate default accounts.');
    }

    try {
      const template = await this.prisma.$transaction(async (tx) => {
        if (defaultAccountName !== currentTemplate.name) {
          await this.updateGeneratedAccountTitles({
            description: defaultAccountName,
            template: currentTemplate,
            tx,
            userId: user.id,
          });
        }

        if (dto.status !== undefined && dto.status !== currentTemplate.status) {
          await this.updateLinkedChartAccountStatus(currentTemplate, dto.status, tx, user.id);
        }

        if (currentTemplate.type === DefaultAccountTemplateType.EXPENSE && dto.expenseParentCoaId) {
          await this.updateExpenseGeneratedAccountParent({
            companyId,
            expenseParentCoaId: dto.expenseParentCoaId,
            template: currentTemplate,
            tx,
            userId: user.id,
          });
        }

        return tx.defaultAccount.update({
          where: { id: templateId },
          data: {
            name: defaultAccountName,
            description,
            status: dto.status,
            updatedByUserId: user.id,
          },
          include: DefaultAccountInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Default account updated successfully.',
        defaultAccount: (await this.mapDefaultAccountsWithAuditUsers([template]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'Default Account Name already exists for this type.');
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateDefaultAccountTemplateStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'DA', PermissionAction.CANCEL, 'You do not have permission to inactivate default accounts.');
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(companyId, templateId);

    const template = await this.prisma.$transaction(async (tx) => {
      await this.updateLinkedChartAccountStatus(currentTemplate, dto.status, tx, user.id);

      return tx.defaultAccount.update({
        where: { id: templateId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: DefaultAccountInclude,
      });
    }, MaintenanceTransactionOptions);

    return {
      message: dto.status === ChartAccountStatus.ACTIVE ? 'Default account activated successfully.' : 'Default account inactivated successfully.',
      defaultAccount: (await this.mapDefaultAccountsWithAuditUsers([template]))[0],
    };
  }

  private async mapDefaultAccountsWithAuditUsers(defaultAccounts: Array<DefaultAccount | DefaultAccountPayload>) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      defaultAccounts.flatMap((defaultAccount) => [defaultAccount.createdByUserId, defaultAccount.updatedByUserId]),
    );

    return defaultAccounts.map((defaultAccount) => mapDefaultAccount(defaultAccount as DefaultAccountPayload, userNames));
  }

  private buildListWhere(companyId: number, query: GetDefaultAccountTemplateListQueryDto): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(!query.type ? { type: { in: [...SupportedDefaultAccountTemplateTypes] } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              {
                expenseCoa: {
                  accountCode: { contains: search, mode: 'insensitive' },
                },
              },
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

  private buildOrderBy(query: GetDefaultAccountTemplateListQueryDto): Prisma.DefaultAccountOrderByWithRelationInput[] {
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
    expenseParentCoaId,
    type,
    status,
    tx,
    userId,
  }: {
    companyId: number;
    description: string;
    expenseParentCoaId?: string;
    type: DefaultAccountTemplateType;
    status: ChartAccountStatus;
    tx: Prisma.TransactionClient;
    userId: number;
  }) {
    const result: {
      expenseCoaId?: bigint;
      revenueCoaId?: bigint;
    } = {};
    const selectedExpenseParent =
      type === DefaultAccountTemplateType.EXPENSE && expenseParentCoaId
        ? await this.findExpenseParentOptionOrThrow(companyId, parsePositiveBigIntId(expenseParentCoaId, 'expenseParentCoaId'), tx)
        : undefined;

    for (const account of this.getGeneratedAccountRequests(type, description, selectedExpenseParent)) {
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

  private getGeneratedAccountRequests(
    type: DefaultAccountTemplateType,
    description: string,
    selectedExpenseParent?: ParentChartAccountReference,
  ): GeneratedAccountRequest[] {
    if (type === DefaultAccountTemplateType.EXPENSE) {
      return [
        {
          role: 'EXPENSE_PARENT',
          selectedParentAccount: selectedExpenseParent,
          resultKey: 'expenseCoaId',
          title: description,
          accountLevel: ChartAccountLevel.SPECIFIC,
          accountType: ChartAccountType.EXPENSE,
          accountNature: AccountNature.DEBIT,
          accountGroup: 'Expenses',
          isPostingAccount: true,
        },
      ];
    }

    if (type === DefaultAccountTemplateType.COLLECTION) {
      return [
        {
          role: 'REVENUE_PARENT',
          resultKey: 'revenueCoaId',
          title: description,
          accountLevel: ChartAccountLevel.SPECIFIC,
          accountType: ChartAccountType.REVENUE,
          accountNature: AccountNature.CREDIT,
          accountGroup: 'Revenue',
          isPostingAccount: true,
        },
      ];
    }

    throw new BadRequestException('Default Account Type must be Expense or Collection.');
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

  private async findMappedParentOrThrow(companyId: number, accountRole: DefaultAccountParentRole, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const definition = getDefaultAccountParentDefinition(accountRole);

    return findSystemAccountGroupOrThrow(tx, companyId, definition);
  }

  private async getExpenseParentOptions(companyId: number, tx: Prisma.TransactionClient | PrismaService) {
    const root = await findSystemAccountGroupOrThrow(tx, companyId, SystemAccountGroups.defaultAccount.expenseParent);
    const accounts = await tx.chartAccount.findMany({
      where: {
        companyId,
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: false,
      },
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountLevel: true,
        parentAccountId: true,
      },
      orderBy: [{ accountCode: 'asc' }],
    });
    const accountById = new Map(accounts.map((account) => [account.id, account]));

    return accounts.filter((account) => isDescendantOrSelf(account.id, root.id, accountById));
  }

  private async findExpenseParentOptionOrThrow(
    companyId: number,
    accountId: bigint,
    tx: Prisma.TransactionClient | PrismaService,
  ): Promise<ParentChartAccountReference> {
    const options = await this.getExpenseParentOptions(companyId, tx);
    const account = options.find((option) => option.id === accountId);

    if (!account) {
      throw new BadRequestException('Expense parent account must be an active Expenses group account.');
    }

    return {
      id: account.id,
      accountCode: account.accountCode,
      accountLevel: account.accountLevel,
    };
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
    template: Awaited<ReturnType<DefaultAccountService['findTemplateOrThrow']>>;
    tx: Prisma.TransactionClient;
    userId: number;
  }) {
    if (template.type === DefaultAccountTemplateType.EXPENSE) {
      await this.updateChartAccountTitle(template.expenseCoaId, description, tx, userId);
      return;
    }

    if (template.type === DefaultAccountTemplateType.COLLECTION) {
      await this.updateChartAccountTitle(template.revenueCoaId, description, tx, userId);
      return;
    }

    throw new BadRequestException('Default Account Type must be Expense or Collection.');
  }

  private async updateExpenseGeneratedAccountParent({
    companyId,
    expenseParentCoaId,
    template,
    tx,
    userId,
  }: {
    companyId: number;
    expenseParentCoaId: string;
    template: Awaited<ReturnType<DefaultAccountService['findTemplateOrThrow']>>;
    tx: Prisma.TransactionClient;
    userId: number;
  }) {
    if (!template.expenseCoaId) {
      return;
    }

    const parentAccount = await this.findExpenseParentOptionOrThrow(companyId, parsePositiveBigIntId(expenseParentCoaId, 'expenseParentCoaId'), tx);

    if (template.expenseCoa?.parentAccountId === parentAccount.id) {
      return;
    }

    const accountCode = await this.generateNextAccountCode(companyId, parentAccount.id, parentAccount.accountCode, ChartAccountLevel.SPECIFIC, tx);

    await tx.chartAccount.update({
      where: { id: template.expenseCoaId },
      data: {
        accountCode,
        parentAccountId: parentAccount.id,
        whoModified: String(userId),
      },
    });
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
    template: Awaited<ReturnType<DefaultAccountService['findTemplateOrThrow']>>,
    status: ChartAccountStatus,
    tx: Prisma.TransactionClient,
    userId: number,
  ) {
    const chartAccountIds = [template.expenseCoaId, template.revenueCoaId].filter((id): id is bigint => Boolean(id));

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
      throw new BadRequestException('Default Account Name is required.');
    }

    return description;
  }

  private normalizeTemplateDescription(value: string | undefined) {
    const description = value?.trim();
    return description ? description : null;
  }

  private ensureSupportedDefaultAccountType(type: DefaultAccountTemplateType | undefined) {
    if (type && !SupportedDefaultAccountTemplateTypes.includes(type as (typeof SupportedDefaultAccountTemplateTypes)[number])) {
      throw new BadRequestException('Default Account Type must be Expense or Collection.');
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
      throw new ConflictException('Default Account Name already exists for this type.');
    }
  }

  private async ensureChartAccountTitleAvailable(companyId: number, parentAccountId: bigint, accountTitle: string) {
    const existingAccount = await this.prisma.chartAccount.findFirst({
      where: {
        companyId,
        deletedAt: null,
        parentAccountId,
        accountTitle: { equals: accountTitle, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException('Expense Type Name already exists under the selected parent.');
    }
  }

  private async findTemplateOrThrow(companyId: number, templateId: bigint) {
    const template = await this.prisma.defaultAccount.findFirst({
      where: { id: templateId, companyId, deletedAt: null, type: { in: [...SupportedDefaultAccountTemplateTypes] } },
      include: DefaultAccountInclude,
    });

    if (!template) {
      throw new NotFoundException('Default account not found.');
    }

    return template;
  }
}

function getDefaultAccountParentDefinition(role: DefaultAccountParentRole) {
  if (role === 'EXPENSE_PARENT') {
    return SystemAccountGroups.defaultAccount.expenseParent;
  }

  if (role === 'REVENUE_PARENT') {
    return SystemAccountGroups.defaultAccount.revenueParent;
  }

  return SystemAccountGroups.defaultAccount.revenueParent;
}

function isDescendantOrSelf(
  accountId: bigint,
  rootAccountId: bigint,
  accountById: Map<
    bigint,
    {
      id: bigint;
      parentAccountId: bigint | null;
    }
  >,
) {
  let currentId: bigint | null = accountId;

  while (currentId) {
    if (currentId === rootAccountId) {
      return true;
    }

    currentId = accountById.get(currentId)?.parentAccountId ?? null;
  }

  return false;
}
