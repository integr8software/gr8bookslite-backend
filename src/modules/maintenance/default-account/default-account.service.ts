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
import { generateNextAccountCodeFromSiblings } from '../chart-of-accounts/utils/chart-account-code.util';
import { CreateDefaultAccountTemplateDto } from './dto/create-default-account-template.dto';
import { GetDefaultAccountTemplateListQueryDto } from './dto/get-default-account-template-list-query.dto';
import { UpdateDefaultAccountTemplateStatusDto } from './dto/update-default-account-template-status.dto';
import { UpdateDefaultAccountTemplateDto } from './dto/update-default-account-template.dto';
import { mapDefaultAccountTemplate } from './mappers/default-account-template.mapper';
import { DefaultAccountTemplateInclude } from './prisma/default-account-template.include';

const DefaultPage = 1;
const DefaultLimit = 500;
const DefaultAccountPermissionCode = 'DA';
const DefaultAccountModuleCode = 'DA';
const DefaultAccountTransactionOptions = {
  maxWait: 10_000,
  timeout: 30_000,
};
const FallbackParentAccountCodeByRole: Record<DefaultAccountParentRole, string> =
  {
    EXPENSE_PARENT: '6010000000',
    REVENUE_PARENT: '4020000000',
    FIXED_ASSET_PARENT: '1020100000',
    ACCUMULATED_DEPRECIATION_PARENT: '1020100000',
    DEPRECIATION_EXPENSE_PARENT: '6020001000',
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

type GeneratedAccountRequest = {
  role: DefaultAccountParentRole;
  generatedKey?: GeneratedAccountKey;
  parentGeneratedKey?: GeneratedAccountKey;
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
      this.prisma.defaultAccountTemplate.findMany({
        where,
        include: DefaultAccountTemplateInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.defaultAccountTemplate.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      defaultAccounts: defaultAccounts.map(mapDefaultAccountTemplate),
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
    const template = await this.findTemplateOrThrow(companyId, parseBigIntId(id));

    return {
      defaultAccount: mapDefaultAccountTemplate(template),
      permissions: this.getPermissions(user, companyId),
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
          type: dto.type,
          status: requestedStatus,
          tx,
          userId: user.id,
        });

        return tx.defaultAccountTemplate.create({
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
          include: DefaultAccountTemplateInclude,
        });
      }, DefaultAccountTransactionOptions);

      return {
        message: 'Default account created successfully.',
        defaultAccount: mapDefaultAccountTemplate(template),
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
    const templateId = parseBigIntId(id);
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

        return tx.defaultAccountTemplate.update({
          where: { id: templateId },
          data: {
            name: defaultAccountName,
            description,
            status: dto.status,
            updatedByUserId: user.id,
          },
          include: DefaultAccountTemplateInclude,
        });
      }, DefaultAccountTransactionOptions);

      return {
        message: 'Default account updated successfully.',
        defaultAccount: mapDefaultAccountTemplate(template),
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
    const templateId = parseBigIntId(id);
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

      return tx.defaultAccountTemplate.update({
        where: { id: templateId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: DefaultAccountTemplateInclude,
      });
    }, DefaultAccountTransactionOptions);

    return {
      message:
        dto.status === ChartAccountStatus.ACTIVE
          ? 'Default account activated successfully.'
          : 'Default account inactivated successfully.',
      defaultAccount: mapDefaultAccountTemplate(template),
    };
  }

  private buildListWhere(
    companyId: number,
    query: GetDefaultAccountTemplateListQueryDto,
  ): Prisma.DefaultAccountTemplateWhereInput {
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
  ): Prisma.DefaultAccountTemplateOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private async getStatistics(companyId: number) {
    const groups = await this.prisma.defaultAccountTemplate.groupBy({
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
      assetCoaId?: bigint;
      accumulatedDepreciationCoaId?: bigint;
    } = {};
    const generatedAccounts = new Map<
      GeneratedAccountKey,
      Awaited<ReturnType<DefaultAccountService['createGeneratedChartAccount']>>
    >();

    for (const account of this.getGeneratedAccountRequests(type, description)) {
      const parentAccount = account.parentGeneratedKey
        ? generatedAccounts.get(account.parentGeneratedKey)
        : undefined;

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
  ): GeneratedAccountRequest[] {
    if (type === DefaultAccountTemplateType.EXPENSE) {
      return [
        {
          role: 'EXPENSE_PARENT',
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
        accountNature: AccountNature.CREDIT,
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
        accountGroup,
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
    const mapping = await tx.companyDefaultAccount.findFirst({
      where: {
        companyId,
        moduleCode: DefaultAccountModuleCode,
        accountRole,
        status: ChartAccountStatus.ACTIVE,
        chartAccount: {
          companyId,
          status: ChartAccountStatus.ACTIVE,
          deletedAt: null,
        },
      },
      include: { chartAccount: true },
    });

    if (mapping) {
      return mapping.chartAccount;
    }

    const fallbackAccountCode = FallbackParentAccountCodeByRole[accountRole];
    const fallbackAccount = await tx.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: fallbackAccountCode,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!fallbackAccount) {
      throw new BadRequestException(
        'Cannot create default account. Required Chart of Accounts parent mapping was not found.',
      );
    }

    return fallbackAccount;
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
    const existingTemplate = await this.prisma.defaultAccountTemplate.findFirst({
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
    const template = await this.prisma.defaultAccountTemplate.findFirst({
      where: { id: templateId, companyId, deletedAt: null },
      include: DefaultAccountTemplateInclude,
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
