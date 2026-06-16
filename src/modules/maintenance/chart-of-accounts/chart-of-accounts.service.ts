import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChartAccountLevel,
  ChartAccountStatus,
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateChartAccountDto } from './dto/create-chart-account.dto';
import { GetChartAccountListQueryDto } from './dto/get-chart-account-list-query.dto';
import { GetNextChartAccountCodeQueryDto } from './dto/get-next-chart-account-code-query.dto';
import { UpdateChartAccountStatusDto } from './dto/update-chart-account-status.dto';
import { UpdateChartAccountDto } from './dto/update-chart-account.dto';
import {
  mapChartAccount,
  mapChartAccountTreeNode,
  type ChartAccountPayload,
  type ChartAccountTreePayload,
} from './mappers/chart-account.mapper';
import { ChartAccountInclude } from './prisma/chart-account.include';
import {
  assertCanCreateAccountLevel,
  generateNextAccountCodeFromSiblings,
} from './utils/chart-account-code.util';

const ChartAccountTransactionOptions = {
  maxWait: 10_000,
  timeout: 30_000,
};

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetChartAccountListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const parentAccountId = parseOptionalBigIntId(
      query.parentAccountId,
      'parentAccountId',
    );
    const search = query.search?.trim();

    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(query.accountLevel ? { accountLevel: query.accountLevel } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(parentAccountId !== undefined ? { parentAccountId } : {}),
        ...(search
          ? {
              OR: [
                {
                  accountCode: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  accountTitle: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      include: ChartAccountInclude,
      orderBy: [
        { accountCode: 'asc' },
        { orderNo: 'asc' },
        { accountTitle: 'asc' },
      ],
    });

    return {
      accounts: accounts.map(mapChartAccount),
    };
  }

  async findTree(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
      include: ChartAccountInclude,
      orderBy: [
        { accountCode: 'asc' },
        { orderNo: 'asc' },
        { accountTitle: 'asc' },
      ],
    });

    return {
      accounts: buildChartAccountTree(accounts).map(mapChartAccountTreeNode),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const account = await this.findAccountOrThrow(companyId, parseBigIntId(id));

    return {
      account: mapChartAccount(account),
    };
  }

  async findNextCode(user: AuthUser, query: GetNextChartAccountCodeQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const parentAccountId = parseOptionalBigIntId(
      query.parentAccountId,
      'parentAccountId',
    );
    const parentAccount = parentAccountId
      ? await this.findActiveParentAccount(companyId, parentAccountId)
      : null;

    assertCanCreateAccountLevel(
      parentAccount?.accountLevel ?? null,
      query.accountLevel,
    );
    const accountCode = await this.generateNextAccountCode({
      companyId,
      parentAccountId: parentAccount?.id ?? null,
      parentAccountCode: parentAccount?.accountCode ?? null,
      accountLevel: query.accountLevel,
    });

    return {
      accountCode,
    };
  }

  async create(user: AuthUser, dto: CreateChartAccountDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    const parentAccountId = parseOptionalBigIntId(
      dto.parentAccountId,
      'parentAccountId',
    );

    try {
      const account = await this.prisma.$transaction<ChartAccountPayload>(
        async (tx) => {
          const parentAccount = parentAccountId
            ? await this.findActiveParentAccount(companyId, parentAccountId, tx)
            : null;

          assertCanCreateAccountLevel(
            parentAccount?.accountLevel ?? null,
            dto.accountLevel,
          );
          const accountCode = await this.generateNextAccountCode({
            companyId,
            parentAccountId: parentAccount?.id ?? null,
            parentAccountCode: parentAccount?.accountCode ?? null,
            accountLevel: dto.accountLevel,
            tx,
          });

          const savedAccount = await tx.chartAccount.create({
            data: {
              ...this.toChartAccountData(dto),
              accountTitle: dto.accountTitle.trim(),
              accountCode,
              accountLevel: dto.accountLevel,
              companyId,
              parentAccountId: parentAccount?.id ?? null,
              whoCreated: String(user.id),
            },
            include: ChartAccountInclude,
          });

          return savedAccount;
        },
        ChartAccountTransactionOptions,
      );

      return {
        message: 'Chart account created.',
        account: mapChartAccount(account),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateChartAccountDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    const accountId = parseBigIntId(id);
    await this.findAccountOrThrow(companyId, accountId);
    const parentAccountId = parseOptionalBigIntId(
      dto.parentAccountId,
      'parentAccountId',
    );

    try {
      const account = await this.prisma.$transaction(async (tx) => {
        const currentAccount = await this.findAccountOrThrow(
          companyId,
          accountId,
          tx,
        );
        const nextLevel = dto.accountLevel ?? currentAccount.accountLevel;
        const shouldReparent =
          dto.parentAccountId !== undefined || dto.accountLevel !== undefined;
        let nextParentAccountId = currentAccount.parentAccountId;
        let nextAccountCode = currentAccount.accountCode;

        if (shouldReparent) {
          nextParentAccountId =
            dto.parentAccountId === undefined
              ? currentAccount.parentAccountId
              : (parentAccountId ?? null);

          if (nextParentAccountId === accountId) {
            throw new BadRequestException(
              'An account cannot be its own parent.',
            );
          }

          const parentAccount = nextParentAccountId
            ? await this.findActiveParentAccount(
                companyId,
                nextParentAccountId,
                tx,
              )
            : null;

          assertCanCreateAccountLevel(
            parentAccount?.accountLevel ?? null,
            nextLevel,
          );
          nextAccountCode = await this.generateNextAccountCode({
            companyId,
            parentAccountId: parentAccount?.id ?? null,
            parentAccountCode: parentAccount?.accountCode ?? null,
            accountLevel: nextLevel,
            excludeAccountId: accountId,
            tx,
          });
        }

        return tx.chartAccount.update({
          where: {
            id: accountId,
          },
          data: {
            ...this.toChartAccountData(dto),
            accountCode: nextAccountCode,
            accountLevel: nextLevel,
            parentAccountId: nextParentAccountId,
            whoModified: String(user.id),
          },
          include: ChartAccountInclude,
        });
      }, ChartAccountTransactionOptions);

      return {
        message: 'Chart account updated.',
        account: mapChartAccount(account),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    dto: UpdateChartAccountStatusDto,
  ) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    const accountId = parseBigIntId(id);
    await this.findAccountOrThrow(companyId, accountId);

    if (dto.status === ChartAccountStatus.INACTIVE) {
      const activeChildCount = await this.prisma.chartAccount.count({
        where: {
          companyId,
          parentAccountId: accountId,
          status: ChartAccountStatus.ACTIVE,
          deletedAt: null,
        },
      });

      if (activeChildCount > 0) {
        throw new BadRequestException(
          'Deactivate child accounts before deactivating this account.',
        );
      }
    }

    const account = await this.prisma.chartAccount.update({
      where: {
        id: accountId,
      },
      data: {
        status: dto.status,
        deletedAt:
          dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
        whoModified: String(user.id),
      },
      include: ChartAccountInclude,
    });

    return {
      message:
        dto.status === ChartAccountStatus.ACTIVE
          ? 'Chart account activated.'
          : 'Chart account deactivated.',
      account: mapChartAccount(account),
    };
  }

  private async generateNextAccountCode({
    companyId,
    parentAccountId,
    parentAccountCode,
    accountLevel,
    excludeAccountId,
    tx = this.prisma,
  }: {
    companyId: number;
    parentAccountId: bigint | null;
    parentAccountCode: string | null;
    accountLevel: ChartAccountLevel;
    excludeAccountId?: bigint;
    tx?: Prisma.TransactionClient | PrismaService;
  }) {
    const siblings = await tx.chartAccount.findMany({
      where: {
        companyId,
        parentAccountId,
        accountLevel,
        ...(excludeAccountId
          ? {
              id: {
                not: excludeAccountId,
              },
            }
          : {}),
      },
      select: {
        accountCode: true,
      },
      orderBy: {
        accountCode: 'asc',
      },
    });

    return generateNextAccountCodeFromSiblings({
      parentCode: parentAccountCode,
      accountLevel,
      siblingCodes: siblings.map((sibling) => sibling.accountCode),
    });
  }

  private async findAccountOrThrow(
    companyId: number,
    accountId: bigint,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const account = await tx.chartAccount.findFirst({
      where: {
        id: accountId,
        companyId,
        deletedAt: null,
      },
      include: ChartAccountInclude,
    });

    if (!account) {
      throw new NotFoundException('Chart account not found.');
    }

    return account;
  }

  private async findActiveParentAccount(
    companyId: number,
    parentAccountId: bigint,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const parentAccount = await this.findAccountOrThrow(
      companyId,
      parentAccountId,
      tx,
    );

    if (parentAccount.status !== ChartAccountStatus.ACTIVE) {
      throw new BadRequestException('Select an active parent account.');
    }

    return parentAccount;
  }

  private toChartAccountData(
    dto: CreateChartAccountDto | UpdateChartAccountDto,
  ) {
    return {
      ...(dto.accountTitle !== undefined
        ? { accountTitle: dto.accountTitle.trim() }
        : {}),
      ...(dto.accountType !== undefined
        ? { accountType: dto.accountType }
        : {}),
      ...(dto.accountNature !== undefined
        ? { accountNature: dto.accountNature }
        : {}),
      ...(dto.accountGroup !== undefined
        ? { accountGroup: cleanOptional(dto.accountGroup) }
        : {}),
      ...(dto.reportAlias !== undefined
        ? { reportAlias: cleanOptional(dto.reportAlias) }
        : {}),
      ...(dto.class !== undefined ? { class: cleanOptional(dto.class) } : {}),
      ...(dto.isPostingAccount !== undefined
        ? { isPostingAccount: dto.isPostingAccount }
        : {}),
      ...(dto.withSubsidiary !== undefined
        ? { withSubsidiary: dto.withSubsidiary }
        : {}),
      ...(dto.contraAccount !== undefined
        ? { contraAccount: dto.contraAccount }
        : {}),
      ...(dto.showTotal !== undefined ? { showTotal: dto.showTotal } : {}),
      ...(dto.orderNo !== undefined ? { orderNo: dto.orderNo } : {}),
      ...(dto.currencyCode !== undefined
        ? {
            currencyCode:
              cleanOptional(dto.currencyCode)?.toUpperCase() ?? null,
          }
        : {}),
    };
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

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new NotFoundException('Company not found.');
    }
  }

  private async ensureCompanyAdminAccess(user: AuthUser, companyId: number) {
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
        role: true,
        status: true,
      },
    });

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Admin access is required to manage chart accounts.',
      );
    }
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A chart account with this code already exists.',
      );
    }
  }
}

function buildChartAccountTree(accounts: ChartAccountTreePayload[]) {
  const nodeById = new Map<string, ChartAccountTreePayload>();
  const rootNodes: ChartAccountTreePayload[] = [];

  for (const account of accounts) {
    nodeById.set(account.id.toString(), {
      ...account,
      children: [],
    });
  }

  for (const account of nodeById.values()) {
    if (!account.parentAccountId) {
      rootNodes.push(account);
      continue;
    }

    const parent = nodeById.get(account.parentAccountId.toString());

    if (!parent) {
      rootNodes.push(account);
      continue;
    }

    parent.children?.push(account);
  }

  return rootNodes;
}

function cleanOptional(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value.trim() || null;
}

function parseOptionalBigIntId(value: string | undefined, label: string) {
  if (value === undefined) {
    return undefined;
  }

  return parseBigIntId(value, label);
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
