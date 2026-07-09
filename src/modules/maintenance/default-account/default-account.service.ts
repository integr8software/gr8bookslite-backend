import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountStatus,
  ChartAccountType,
  DefaultAccountTemplateType,
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { parsePositiveBigIntId } from '../utils/maintenance-id.util';
import { generateNextAccountCodeFromSiblings } from '../chart-of-accounts/utils/chart-account-code.util';
import {
  findSystemAccountGroupOrThrow,
  mergeAccountGroupTags,
  SystemAccountGroups,
} from '../chart-of-accounts/utils/system-account-groups.util';
import { CreateDefaultAccountTemplateDto } from './dto/create-default-account-template.dto';
import { GetDefaultAccountTemplateListQueryDto } from './dto/get-default-account-template-list-query.dto';
import { UpdateDefaultAccountTemplateStatusDto } from './dto/update-default-account-template-status.dto';
import { UpdateDefaultAccountTemplateDto } from './dto/update-default-account-template.dto';
import { mapDefaultAccount } from './mappers/default-account-template.mapper';
import { DefaultAccountInclude } from './prisma/default-account-template.include';

const DefaultPage = 1;
const DefaultLimit = 500;
const DefaultAccountPermissionCode = 'DA';
const DefaultAccountTransactionOptions = {
  maxWait: 10_000,
  timeout: 30_000,
};

type DefaultAccountParentRole =
  | 'EXPENSE_PARENT'
  | 'REVENUE_PARENT'
  | 'FIXED_ASSET_PARENT'
  | 'ACCUMULATED_DEPRECIATION_PARENT'
  | 'DEPRECIATION_EXPENSE_PARENT';

type GeneratedAccountKey = 'fixedAssetGroup';

type GeneratedAccountResultKey =
  | 'expenseCoaId'
  | 'revenueCoaId'
  | 'assetCoaId'
  | 'accumulatedDepreciationCoaId';

type ParentChartAccountReference = {
  id: bigint;
  accountCode: string;
};

type GeneratedAccountRequest = {
  role: DefaultAccountParentRole;
  generatedKey?: GeneratedAccountKey;
  parentGeneratedKey?: GeneratedAccountKey;
  selectedParentAccount?: ParentChartAccountReference;
  resultKey?: GeneratedAccountResultKey;
  title: string;
  accountLevel: ChartAccountLevel;
  accountType: ChartAccountType;
  accountNature: AccountNature;
  accountGroup: string;
  isPostingAccount: boolean;
};

@Injectable()
export class DefaultAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetDefaultAccountTemplateListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

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
      defaultAccounts: defaultAccounts.map(mapDefaultAccount),
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
    const template = await this.findTemplateOrThrow(
      companyId,
      parsePositiveBigIntId(id),
    );

    return {
      defaultAccount: mapDefaultAccount(template),
      permissions: this.getPermissions(user, companyId),
    };
  }

  async findExpenseParentOptions(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const options = await this.getExpenseParentOptions(companyId, this.prisma);

    return {
      options: options.map((account) => ({
        id: account.id.toString(),
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
        accountLevel: account.accountLevel,
        parentAccountId: account.parentAccountId?.toString() ?? null,
      })),
    };
  }

  async create(user: AuthUser, dto: CreateDefaultAccountTemplateDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    const defaultAccountName = this.validateDefaultAccountName(
      dto.defaultAccountName,
    );
    const description = this.normalizeTemplateDescription(dto.description);
    await this.ensureDefaultAccountNameAvailable(
      companyId,
      dto.type,
      defaultAccountName,
    );

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
            assetCoaId: generatedAccounts.assetCoaId,
            accumulatedDepreciationCoaId:
              generatedAccounts.accumulatedDepreciationCoaId,
            createdByUserId: user.id,
          },
          include: DefaultAccountInclude,
        });
      }, DefaultAccountTransactionOptions);

      return {
        message: 'Default account created successfully.',
        defaultAccount: mapDefaultAccount(template),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateDefaultAccountTemplateDto,
  ) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(
      companyId,
      templateId,
    );

    if (dto.type !== undefined && dto.type !== currentTemplate.type) {
      throw new BadRequestException('Default account type cannot be changed.');
    }

    const defaultAccountName =
      dto.defaultAccountName === undefined
        ? currentTemplate.name
        : this.validateDefaultAccountName(dto.defaultAccountName);
    const description =
      dto.description === undefined
        ? currentTemplate.description
        : this.normalizeTemplateDescription(dto.description);

    if (defaultAccountName !== currentTemplate.name) {
      await this.ensureDefaultAccountNameAvailable(
        companyId,
        currentTemplate.type,
        defaultAccountName,
        templateId,
      );
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
          await this.updateLinkedChartAccountStatus(
            currentTemplate,
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
            updatedByUserId: user.id,
          },
          include: DefaultAccountInclude,
        });
      }, DefaultAccountTransactionOptions);

      return {
        message: 'Default account updated successfully.',
        defaultAccount: mapDefaultAccount(template),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    dto: UpdateDefaultAccountTemplateStatusDto,
  ) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const templateId = parsePositiveBigIntId(id);
    const currentTemplate = await this.findTemplateOrThrow(
      companyId,
      templateId,
    );

    const template = await this.prisma.$transaction(async (tx) => {
      await this.updateLinkedChartAccountStatus(
        currentTemplate,
        dto.status,
        tx,
        user.id,
      );

      return tx.defaultAccount.update({
        where: { id: templateId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: DefaultAccountInclude,
      });
    }, DefaultAccountTransactionOptions);

    return {
      message:
        dto.status === ChartAccountStatus.ACTIVE
          ? 'Default account activated successfully.'
          : 'Default account inactivated successfully.',
      defaultAccount: mapDefaultAccount(template),
    };
  }

  private buildListWhere(
    companyId: number,
    query: GetDefaultAccountTemplateListQueryDto,
  ): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
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

  private buildOrderBy(
    query: GetDefaultAccountTemplateListQueryDto,
  ): Prisma.DefaultAccountOrderByWithRelationInput[] {
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
      totalDefaultAccounts: groups.reduce(
        (total, group) => total + group._count._all,
        0,
      ),
      activeDefaultAccounts: groups
        .filter((group) => group.status === ChartAccountStatus.ACTIVE)
        .reduce((total, group) => total + group._count._all, 0),
      inactiveDefaultAccounts: groups
        .filter((group) => group.status === ChartAccountStatus.INACTIVE)
        .reduce((total, group) => total + group._count._all, 0),
      expenseDefaultAccounts:
        groups.find((group) => group.type === DefaultAccountTemplateType.EXPENSE)
          ?._count._all ?? 0,
      collectionDefaultAccounts:
        groups.find(
          (group) => group.type === DefaultAccountTemplateType.COLLECTION,
        )?._count._all ?? 0,
      fixedAssetDefaultAccounts:
        groups.find(
          (group) => group.type === DefaultAccountTemplateType.FIXED_ASSET,
        )?._count._all ?? 0,
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
      assetCoaId?: bigint;
      accumulatedDepreciationCoaId?: bigint;
    } = {};
    const generatedAccounts = new Map<
      GeneratedAccountKey,
      Awaited<ReturnType<DefaultAccountService['createGeneratedChartAccount']>>
    >();
    const selectedExpenseParent =
      type === DefaultAccountTemplateType.EXPENSE && expenseParentCoaId
        ? await this.findExpenseParentOptionOrThrow(
            companyId,
            parsePositiveBigIntId(expenseParentCoaId, 'expenseParentCoaId'),
            tx,
          )
        : undefined;

    for (const account of this.getGeneratedAccountRequests(
      type,
      description,
      selectedExpenseParent,
    )) {
      const parentAccount = account.parentGeneratedKey
        ? generatedAccounts.get(account.parentGeneratedKey)
        : account.selectedParentAccount;

      if (account.parentGeneratedKey && !parentAccount) {
        throw new BadRequestException(
          'Cannot create default account. Required generated parent account was not found.',
        );
      }

      const chartAccount = await this.createGeneratedChartAccount({
        companyId,
        status,
        tx,
        userId,
        parentAccount,
        ...account,
      });

      if (account.generatedKey) {
        generatedAccounts.set(account.generatedKey, chartAccount);
      }

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

    return [
      {
        role: 'FIXED_ASSET_PARENT',
        generatedKey: 'fixedAssetGroup',
        title: description,
        accountLevel: ChartAccountLevel.SUB3,
        accountType: ChartAccountType.ASSET,
        accountNature: AccountNature.DEBIT,
        accountGroup: 'Fixed Assets',
        isPostingAccount: false,
      },
      {
        role: 'FIXED_ASSET_PARENT',
        parentGeneratedKey: 'fixedAssetGroup',
        resultKey: 'assetCoaId',
        title: description,
        accountLevel: ChartAccountLevel.SPECIFIC,
        accountType: ChartAccountType.ASSET,
        accountNature: AccountNature.DEBIT,
        accountGroup: 'Fixed Assets',
        isPostingAccount: true,
      },
      {
        role: 'ACCUMULATED_DEPRECIATION_PARENT',
        parentGeneratedKey: 'fixedAssetGroup',
        resultKey: 'accumulatedDepreciationCoaId',
        title: `Accumulated Depreciation - ${description}`,
        accountLevel: ChartAccountLevel.SPECIFIC,
        accountType: ChartAccountType.ASSET,
        accountNature: AccountNature.DEBIT,
        accountGroup: 'Accumulated Depreciation',
        isPostingAccount: true,
      },
      {
        role: 'DEPRECIATION_EXPENSE_PARENT',
        resultKey: 'expenseCoaId',
        title: `Depreciation Expense - ${description}`,
        accountLevel: ChartAccountLevel.SPECIFIC,
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        accountGroup: 'Depreciation Expense',
        isPostingAccount: true,
      },
    ];
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
    const parentAccount =
      providedParentAccount ??
      (await this.findMappedParentOrThrow(companyId, role, tx));
    const accountCode = await this.generateNextAccountCode(
      companyId,
      parentAccount.id,
      parentAccount.accountCode,
      accountLevel,
      tx,
    );

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

  private async findMappedParentOrThrow(
    companyId: number,
    accountRole: DefaultAccountParentRole,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const definition = getDefaultAccountParentDefinition(accountRole);

    return findSystemAccountGroupOrThrow(tx, companyId, definition);
  }

  private async getExpenseParentOptions(
    companyId: number,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    const root = await findSystemAccountGroupOrThrow(
      tx,
      companyId,
      SystemAccountGroups.defaultAccount.expenseParent,
    );
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

    return accounts.filter((account) =>
      isDescendantOrSelf(account.id, root.id, accountById),
    );
  }

  private async findExpenseParentOptionOrThrow(
    companyId: number,
    accountId: bigint,
    tx: Prisma.TransactionClient | PrismaService,
  ): Promise<ParentChartAccountReference> {
    const options = await this.getExpenseParentOptions(companyId, tx);
    const account = options.find((option) => option.id === accountId);

    if (!account) {
      throw new BadRequestException(
        'Expense parent account must be an active Expenses group account.',
      );
    }

    return {
      id: account.id,
      accountCode: account.accountCode,
    };
  }

  private async generateNextAccountCode(
    companyId: number,
    parentAccountId: bigint,
    parentAccountCode: string,
    accountLevel: ChartAccountLevel,
    tx: Prisma.TransactionClient,
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
      await this.updateChartAccountTitle(
        template.expenseCoaId,
        description,
        tx,
        userId,
      );
      return;
    }

    if (template.type === DefaultAccountTemplateType.COLLECTION) {
      await this.updateChartAccountTitle(
        template.revenueCoaId,
        description,
        tx,
        userId,
      );
      return;
    }

    const fixedAssetGroupId = await this.findGeneratedFixedAssetGroupId(
      template,
      tx,
    );
    await this.updateChartAccountTitle(
      fixedAssetGroupId,
      description,
      tx,
      userId,
    );
    await this.updateChartAccountTitle(
      template.assetCoaId,
      description,
      tx,
      userId,
    );
    await this.updateChartAccountTitle(
      template.accumulatedDepreciationCoaId,
      `Accumulated Depreciation - ${description}`,
      tx,
      userId,
    );
    await this.updateChartAccountTitle(
      template.expenseCoaId,
      `Depreciation Expense - ${description}`,
      tx,
      userId,
    );
  }

  private async updateChartAccountTitle(
    chartAccountId: bigint | null,
    accountTitle: string,
    tx: Prisma.TransactionClient,
    userId: number,
  ) {
    if (!chartAccountId) {
      return;
    }

    await tx.chartAccount.update({
      where: { id: chartAccountId },
      data: { accountTitle, whoModified: String(userId) },
    });
  }

  private async findGeneratedFixedAssetGroupId(
    template: Awaited<ReturnType<DefaultAccountService['findTemplateOrThrow']>>,
    tx: Prisma.TransactionClient,
  ) {
    if (
      template.type !== DefaultAccountTemplateType.FIXED_ASSET ||
      !template.assetCoaId ||
      !template.accumulatedDepreciationCoaId
    ) {
      return null;
    }

    const linkedAccounts = await tx.chartAccount.findMany({
      where: {
        companyId: template.companyId,
        id: {
          in: [template.assetCoaId, template.accumulatedDepreciationCoaId],
        },
      },
      select: {
        id: true,
        parentAccountId: true,
      },
    });
    const assetAccount = linkedAccounts.find(
      (account) => account.id === template.assetCoaId,
    );
    const accumulatedDepreciationAccount = linkedAccounts.find(
      (account) => account.id === template.accumulatedDepreciationCoaId,
    );

    if (
      !assetAccount?.parentAccountId ||
      assetAccount.parentAccountId !==
        accumulatedDepreciationAccount?.parentAccountId
    ) {
      return null;
    }

    const generatedParentAccount = await tx.chartAccount.findFirst({
      where: {
        id: assetAccount.parentAccountId,
        companyId: template.companyId,
        accountLevel: ChartAccountLevel.SUB3,
      },
      select: { id: true },
    });

    return generatedParentAccount?.id ?? null;
  }

  private async updateLinkedChartAccountStatus(
    template: Awaited<ReturnType<DefaultAccountService['findTemplateOrThrow']>>,
    status: ChartAccountStatus,
    tx: Prisma.TransactionClient,
    userId: number,
  ) {
    const fixedAssetGroupId = await this.findGeneratedFixedAssetGroupId(
      template,
      tx,
    );
    const chartAccountIds = [
      template.expenseCoaId,
      template.revenueCoaId,
      template.assetCoaId,
      template.accumulatedDepreciationCoaId,
      fixedAssetGroupId,
    ].filter((id): id is bigint => Boolean(id));

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

  private async ensureDefaultAccountNameAvailable(
    companyId: number,
    type: DefaultAccountTemplateType,
    description: string,
    excludedTemplateId?: bigint,
  ) {
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
      throw new ConflictException(
        'Default Account Name already exists for this type.',
      );
    }
  }

  private async findTemplateOrThrow(companyId: number, templateId: bigint) {
    const template = await this.prisma.defaultAccount.findFirst({
      where: { id: templateId, companyId, deletedAt: null },
      include: DefaultAccountInclude,
    });

    if (!template) {
      throw new NotFoundException('Default account not found.');
    }

    return template;
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
      where: { userId_companyId: { userId: user.id, companyId } },
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
      user.permissions.includes(`${DefaultAccountPermissionCode}:${action}`)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage default account records.',
    );
  }

  private getPermissions(user: AuthUser, companyId: number) {
    return {
      canView: this.can(user, companyId, PermissionAction.VIEW),
      canCreate: this.can(user, companyId, PermissionAction.CREATE),
      canUpdate: this.can(user, companyId, PermissionAction.UPDATE),
      canDelete: false,
      canExport: this.can(user, companyId, PermissionAction.EXPORT),
    };
  }

  private can(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return true;
    }

    return (
      user.companyId === companyId &&
      user.permissions.includes(`${DefaultAccountPermissionCode}:${action}`)
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
      throw new ConflictException(
        'Default Account Name already exists for this type.',
      );
    }
  }
}


function getDefaultAccountParentDefinition(role: DefaultAccountParentRole) {
  if (role === 'EXPENSE_PARENT') {
    return SystemAccountGroups.defaultAccount.expenseParent;
  }

  if (role === 'REVENUE_PARENT') {
    return SystemAccountGroups.defaultAccount.revenueParent;
  }

  if (role === 'FIXED_ASSET_PARENT') {
    return SystemAccountGroups.defaultAccount.fixedAssetParent;
  }

  if (role === 'ACCUMULATED_DEPRECIATION_PARENT') {
    return SystemAccountGroups.defaultAccount.accumulatedDepreciationParent;
  }

  return SystemAccountGroups.defaultAccount.depreciationExpenseParent;
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
