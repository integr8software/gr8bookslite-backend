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
import {
  findSystemAccountGroupOrThrow,
  mergeAccountGroupTags,
  SystemAccountGroups,
  SystemAccountGroupTags,
} from '../chart-of-accounts/utils/system-account-groups.util';
import { DisbursementTypeOptionQueryDto } from './dto/disbursement-type-option-query.dto';
import { CreateDisbursementTypeTemplateDto } from './dto/create-disbursement-type-template.dto';
import { GetDisbursementTypeTemplateListQueryDto } from './dto/get-disbursement-type-template-list-query.dto';
import { UpdateDisbursementTypeTemplateStatusDto } from './dto/update-disbursement-type-template-status.dto';
import { UpdateDisbursementTypeTemplateDto } from './dto/update-disbursement-type-template.dto';
import { mapDisbursementType } from './mappers/disbursement-type-template.mapper';
import { DisbursementTypeInclude } from './prisma/disbursement-type-template.include';
import type { DisbursementTypeParentRole, DisbursementTypePayload, GeneratedAccountRequest, ParentChartAccountReference } from './types/disbursement-type.type';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
const SupportedDisbursementTypeTemplateTypes = [DefaultAccountTemplateType.EXPENSE] as const;
export const DisbursementTypeModuleCode = 'DTM';

type DisbursementTypeMaintenanceContext = {
  moduleCode: string;
  type: DefaultAccountTemplateType;
  label: string;
};

@Injectable()
export class DisbursementTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetDisbursementTypeTemplateListQueryDto, context: DisbursementTypeMaintenanceContext) {
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
        include: DisbursementTypeInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.defaultAccount.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      defaultAccounts: await this.mapDisbursementTypesWithAuditUsers(defaultAccounts),
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

  async findOne(user: AuthUser, id: string, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.VIEW, `You do not have permission to view ${label}.`);
    const template = await this.findTemplateOrThrow(companyId, parsePositiveBigIntId(id), context.type);

    return {
      defaultAccount: (await this.mapDisbursementTypesWithAuditUsers([template]))[0],
      permissions: getModulePermissions(user, companyId, moduleCode, { includeCancel: true, includeImport: true }),
    };
  }

  async findExpenseParentOptions(user: AuthUser, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.VIEW, `You do not have permission to view ${label}.`);

    return {
      options: (await this.getExpenseParentOptions(companyId, this.prisma)).map((account) => ({
        id: account.id.toString(),
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
        accountLevel: account.accountLevel,
        parentAccountId: account.parentAccountId?.toString() ?? null,
      })),
    };
  }

  async findAccountOptions(user: AuthUser, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.VIEW, `You do not have permission to view ${label}.`);

    return {
      accounts: (await this.findSelectableExpenseAccounts(companyId, this.prisma)).map((account) => ({
        id: account.id.toString(),
        accountNumber: account.accountCode,
        accountName: account.accountTitle,
        accountType: account.accountType,
        statementGroup: 'Income Statement',
        statementSection: account.statementSection ?? 'Expenses',
        normalBalance: account.accountNature === AccountNature.CREDIT ? 'Credit' : 'Debit',
        accountCategory: 'Detail',
        description: account.description ?? account.accountTitle,
        status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
      })),
    };
  }

  async findOptions(user: AuthUser, query: DisbursementTypeOptionQueryDto) {
    const companyId = await this.ensureDefaultAccountOptionAccess(user);

    return {
      options: await this.findDefaultAccountOptions(companyId, query),
    };
  }

  async findExpenseOptions(user: AuthUser, query: DisbursementTypeOptionQueryDto) {
    const companyId = await this.ensureDefaultAccountOptionAccess(user);

    return {
      options: await this.findDefaultAccountOptions(companyId, query, DefaultAccountTemplateType.EXPENSE),
    };
  }

  async findCollectionOptions(user: AuthUser, query: DisbursementTypeOptionQueryDto) {
    const companyId = await this.ensureDefaultAccountOptionAccess(user);

    return {
      options: await this.findDefaultAccountOptions(companyId, query, DefaultAccountTemplateType.COLLECTION),
    };
  }

  async createExpenseSubAccount(user: AuthUser, dto: CreateChartAccountDto, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.CREATE, `You do not have permission to add ${label}.`);

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
        message: `Expense sub account created successfully. Saved with Account Code - Account Title: ${account.accountCode} - ${account.accountTitle}.`,
        account: {
          id: account.id.toString(),
          accountCode: account.accountCode,
          accountTitle: account.accountTitle,
        },
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'An expense sub account with this code already exists.');
      throw error;
    }
  }

  async create(user: AuthUser, dto: CreateDisbursementTypeTemplateDto, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.CREATE, `You do not have permission to add ${label}.`);
    const scopedDto = { ...dto, ...(context.type ? { type: context.type } : {}) };
    const defaultAccountName = this.validateDefaultAccountName(dto.defaultAccountName);
    const description = this.normalizeTemplateDescription(dto.description);
    this.ensureSupportedDefaultAccountType(scopedDto.type);
    await this.ensureDefaultAccountNameAvailable(companyId, scopedDto.type, defaultAccountName);

    try {
      const template = await this.prisma.$transaction(async (tx) => {
        const requestedStatus = dto.status ?? ChartAccountStatus.ACTIVE;
        const generatedAccounts = await this.createGeneratedAccounts({
          companyId,
          description: defaultAccountName,
          expenseCoaId: dto.expenseCoaId,
          expenseParentCoaId: dto.expenseParentCoaId,
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
            expenseCoaId: generatedAccounts.expenseCoaId,
            revenueCoaId: generatedAccounts.revenueCoaId,
            createdByUserId: user.id,
          },
          include: DisbursementTypeInclude,
        });
      }, MaintenanceTransactionOptions);

      const mappedAccount = (await this.mapDisbursementTypesWithAuditUsers([template]))[0];
      const firstGenerated = mappedAccount.generatedAccounts?.[0];
      const message = firstGenerated
        ? `Disbursement type created successfully. Saved with Account Code - Account Title: ${firstGenerated.accountCode} - ${firstGenerated.accountTitle}.`
        : 'Disbursement type created successfully.';

      return {
        message,
        defaultAccount: mappedAccount,
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'Disbursement Type Name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateDisbursementTypeTemplateDto, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.UPDATE, `You do not have permission to edit ${label}.`);
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(companyId, templateId, context.type);
    const scopedDto = { ...dto, ...(context.type ? { type: context.type } : {}) };
    this.ensureSupportedDefaultAccountType(scopedDto.type);

    if (scopedDto.type !== undefined && scopedDto.type !== currentTemplate.type) {
      throw new BadRequestException('Disbursement type cannot be changed.');
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

        if (currentTemplate.type === DefaultAccountTemplateType.EXPENSE && dto.expenseCoaId) {
          const selectedAccount = await this.findSelectableExpenseAccountOrThrow(companyId, parsePositiveBigIntId(dto.expenseCoaId, 'expenseCoaId'), tx);

          await tx.defaultAccount.update({
            where: { id: templateId },
            data: {
              expenseCoaId: selectedAccount.id,
              updatedByUserId: user.id,
            },
          });
        } else if (currentTemplate.type === DefaultAccountTemplateType.EXPENSE && dto.expenseParentCoaId) {
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
          include: DisbursementTypeInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Disbursement type updated successfully.',
        defaultAccount: (await this.mapDisbursementTypesWithAuditUsers([template]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'Disbursement Type Name already exists.');
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateDisbursementTypeTemplateStatusDto, context: DisbursementTypeMaintenanceContext) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const moduleCode = context.moduleCode;
    const label = context.label;
    ensureModuleAction(user, companyId, moduleCode, PermissionAction.CANCEL, `You do not have permission to inactivate ${label}.`);
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(companyId, templateId, context.type);

    const template = await this.prisma.$transaction(async (tx) => {
      await this.updateLinkedChartAccountStatus(currentTemplate, dto.status, tx, user.id);

      return tx.defaultAccount.update({
        where: { id: templateId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: DisbursementTypeInclude,
      });
    }, MaintenanceTransactionOptions);

    return {
      message: dto.status === ChartAccountStatus.ACTIVE ? 'Disbursement type activated successfully.' : 'Disbursement type inactivated successfully.',
      defaultAccount: (await this.mapDisbursementTypesWithAuditUsers([template]))[0],
    };
  }

  private async mapDisbursementTypesWithAuditUsers(defaultAccounts: Array<DefaultAccount | DisbursementTypePayload>) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      defaultAccounts.flatMap((defaultAccount) => [defaultAccount.createdByUserId, defaultAccount.updatedByUserId]),
    );

    return defaultAccounts.map((defaultAccount) => mapDisbursementType(defaultAccount as DisbursementTypePayload, userNames));
  }

  private async ensureDefaultAccountOptionAccess(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return companyId;
  }

  private async findDefaultAccountOptions(companyId: number, query: DisbursementTypeOptionQueryDto, type?: DefaultAccountTemplateType) {
    const where = this.buildDefaultAccountOptionWhere(companyId, query, type);
    const defaultAccounts = await this.prisma.defaultAccount.findMany({
      where,
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        status: true,
        expenseCoa: {
          select: {
            id: true,
            accountCode: true,
            accountTitle: true,
            accountType: true,
            accountNature: true,
          },
        },
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
      const chartAccount = defaultAccount.type === DefaultAccountTemplateType.EXPENSE ? defaultAccount.expenseCoa : defaultAccount.revenueCoa;

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
    query: DisbursementTypeOptionQueryDto,
    type?: DefaultAccountTemplateType,
  ): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      type: type ?? { in: [DefaultAccountTemplateType.EXPENSE, DefaultAccountTemplateType.COLLECTION] },
      status: query.status ?? ChartAccountStatus.ACTIVE,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { expenseCoa: { accountCode: { contains: search, mode: 'insensitive' } } },
              { expenseCoa: { accountTitle: { contains: search, mode: 'insensitive' } } },
              { revenueCoa: { accountCode: { contains: search, mode: 'insensitive' } } },
              { revenueCoa: { accountTitle: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildListWhere(companyId: number, query: GetDisbursementTypeTemplateListQueryDto): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(!query.type ? { type: { in: [...SupportedDisbursementTypeTemplateTypes] } } : {}),
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

  private buildOrderBy(query: GetDisbursementTypeTemplateListQueryDto): Prisma.DefaultAccountOrderByWithRelationInput[] {
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
    expenseCoaId,
    expenseParentCoaId,
    type,
    status,
    tx,
    userId,
  }: {
    companyId: number;
    description: string;
    expenseCoaId?: string;
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

    if (type === DefaultAccountTemplateType.EXPENSE && expenseCoaId) {
      const selectedAccount = await this.findSelectableExpenseAccountOrThrow(companyId, parsePositiveBigIntId(expenseCoaId, 'expenseCoaId'), tx);

      return {
        expenseCoaId: selectedAccount.id,
      };
    }

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
          accountGroup: [SystemAccountGroupTags.revenue, SystemAccountGroupTags.defaultAccountRevenueParent],
          isPostingAccount: true,
        },
      ];
    }

    throw new BadRequestException('Disbursement type must be Expense.');
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

  private async findMappedParentOrThrow(companyId: number, accountRole: DisbursementTypeParentRole, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
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

  private async findSelectableExpenseAccounts(companyId: number, tx: Prisma.TransactionClient | PrismaService) {
    return tx.chartAccount.findMany({
      where: {
        companyId,
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        accountLevel: ChartAccountLevel.SPECIFIC,
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
        statementSection: true,
        description: true,
        status: true,
      },
      orderBy: [{ accountCode: 'asc' }, { id: 'asc' }],
    });
  }

  private async findSelectableExpenseAccountOrThrow(companyId: number, accountId: bigint, tx: Prisma.TransactionClient | PrismaService) {
    const account = await tx.chartAccount.findFirst({
      where: {
        id: accountId,
        companyId,
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        accountLevel: ChartAccountLevel.SPECIFIC,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
      select: { id: true },
    });

    if (!account) {
      throw new BadRequestException('Select an active expense posting account.');
    }

    return account;
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
    template: Awaited<ReturnType<DisbursementTypeService['findTemplateOrThrow']>>;
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

    throw new BadRequestException('Disbursement type must be Expense.');
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
    template: Awaited<ReturnType<DisbursementTypeService['findTemplateOrThrow']>>;
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
    template: Awaited<ReturnType<DisbursementTypeService['findTemplateOrThrow']>>,
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
      throw new BadRequestException('Disbursement Type Name is required.');
    }

    return description;
  }

  private normalizeTemplateDescription(value: string | undefined) {
    const description = value?.trim();
    return description ? description : null;
  }

  private ensureSupportedDefaultAccountType(type: DefaultAccountTemplateType | undefined) {
    if (type && !SupportedDisbursementTypeTemplateTypes.includes(type as (typeof SupportedDisbursementTypeTemplateTypes)[number])) {
      throw new BadRequestException('Disbursement type must be Expense.');
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
      throw new ConflictException('Disbursement Type Name already exists.');
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

  private async findTemplateOrThrow(companyId: number, templateId: bigint, type?: DefaultAccountTemplateType) {
    const template = await this.prisma.defaultAccount.findFirst({
      where: { id: templateId, companyId, deletedAt: null, type: type ?? { in: [...SupportedDisbursementTypeTemplateTypes] } },
      include: DisbursementTypeInclude,
    });

    if (!template) {
      throw new NotFoundException('Disbursement type not found.');
    }

    return template;
  }
}

function getDefaultAccountParentDefinition(role: DisbursementTypeParentRole) {
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
