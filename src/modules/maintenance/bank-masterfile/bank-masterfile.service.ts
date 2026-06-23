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
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { PermissionCodes } from '../../../common/constants/permission-codes.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { generateNextAccountCodeFromSiblings } from '../chart-of-accounts/utils/chart-account-code.util';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { GetBankAccountListQueryDto } from './dto/get-bank-account-list-query.dto';
import { ImportBankAccountsDto } from './dto/import-bank-accounts.dto';
import { UpdateBankAccountStatusDto } from './dto/update-bank-account-status.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { mapBankAccount } from './mappers/bank-account.mapper';
import { BankAccountInclude } from './prisma/bank-account.include';

const DefaultPage = 1;
const DefaultLimit = 500;
const BaseCurrencyCode = 'PHP';
const CashInBankGroup = 'Cash in Bank';
const BankMasterfileTransactionOptions = {
  maxWait: 10_000,
  timeout: 30_000,
};

@Injectable()
export class BankMasterfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetBankAccountListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [bankAccounts, total, statistics] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where,
        include: BankAccountInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.bankAccount.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      bankAccounts: bankAccounts.map(mapBankAccount),
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
  async getNextAccountCode(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    const cashInBankAccount = await this.findCashInBankParentOrThrow(companyId);
    const accountCode = await this.generateNextCashInBankAccountCode(
      companyId,
      cashInBankAccount.id,
      cashInBankAccount.accountCode,
      this.prisma,
    );

    return {
      accountCode,
      parentAccountCode: cashInBankAccount.accountCode,
      parentAccountTitle: cashInBankAccount.accountTitle,
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    const bankAccount = await this.findBankAccountOrThrow(
      companyId,
      parseBigIntId(id),
    );

    return {
      bankAccount: mapBankAccount(bankAccount),
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateBankAccountDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    this.validateBankInput(dto);
    await this.ensureBankAccountAvailable(companyId, dto);

    try {
      const bankAccount = await this.prisma.$transaction(async (tx) => {
        const cashInBankAccount = await this.findCashInBankParentOrThrow(
          companyId,
          tx,
        );
        const accountCode = dto.accountCode?.trim()
          ? await this.validateManualAccountCode(companyId, dto.accountCode, tx)
          : await this.generateNextCashInBankAccountCode(
              companyId,
              cashInBankAccount.id,
              cashInBankAccount.accountCode,
              tx,
            );
        const accountName = this.resolveAccountName(dto);
        const chartAccount = await tx.chartAccount.create({
          data: {
            companyId,
            parentAccountId: cashInBankAccount.id,
            accountCode,
            accountTitle: accountName,
            accountLevel: ChartAccountLevel.SPECIFIC,
            accountType: ChartAccountType.ASSET,
            accountNature: AccountNature.DEBIT,
            accountGroup: CashInBankGroup,
            isPostingAccount: true,
            currencyCode: cleanCurrencyCode(dto.currencyCode),
            status: dto.status ?? ChartAccountStatus.ACTIVE,
            whoCreated: String(user.id),
          },
        });

        if (dto.isDefault === true) {
          await tx.bankAccount.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
          });
        }

        return tx.bankAccount.create({
          data: {
            companyId,
            coaId: chartAccount.id,
            ...this.toCreateBankAccountData(dto, accountName),
            status: dto.status ?? ChartAccountStatus.ACTIVE,
            createdByUserId: user.id,
          },
          include: BankAccountInclude,
        });
      }, BankMasterfileTransactionOptions);

      return {
        message: 'Bank account created successfully.',
        bankAccount: mapBankAccount(bankAccount),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async importBankAccounts(user: AuthUser, dto: ImportBankAccountsDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);

    dto.banks.forEach((bank) => this.validateBankInput(bank));
    this.ensureNoDuplicateImportedBankAccounts(dto.banks);
    this.ensureNoDuplicateImportedAccountCodes(dto.banks);
    this.ensureAtMostOneDefaultImportedBank(dto.banks);
    await this.ensureImportedBankAccountsAvailable(companyId, dto.banks);
    await this.ensureImportedAccountCodesAvailable(companyId, dto.banks);

    try {
      const bankAccounts = await this.prisma.$transaction(async (tx) => {
        const cashInBankAccount = await this.findCashInBankParentOrThrow(
          companyId,
          tx,
        );

        if (dto.banks.some((bank) => bank.isDefault === true)) {
          await tx.bankAccount.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const createdBankAccountIds: bigint[] = [];

        for (const bank of dto.banks) {
          const accountCode = bank.accountCode?.trim()
            ? await this.validateManualAccountCode(companyId, bank.accountCode, tx)
            : await this.generateNextCashInBankAccountCode(
                companyId,
                cashInBankAccount.id,
                cashInBankAccount.accountCode,
                tx,
              );
          const accountName = this.resolveAccountName(bank);
          const chartAccount = await tx.chartAccount.create({
            data: {
              companyId,
              parentAccountId: cashInBankAccount.id,
              accountCode,
              accountTitle: accountName,
              accountLevel: ChartAccountLevel.SPECIFIC,
              accountType: ChartAccountType.ASSET,
              accountNature: AccountNature.DEBIT,
              accountGroup: CashInBankGroup,
              isPostingAccount: true,
              currencyCode: cleanCurrencyCode(bank.currencyCode),
              status: bank.status ?? ChartAccountStatus.ACTIVE,
              whoCreated: String(user.id),
            },
          });
          const bankAccount = await tx.bankAccount.create({
            data: {
              companyId,
              coaId: chartAccount.id,
              ...this.toCreateBankAccountData(bank, accountName),
              status: bank.status ?? ChartAccountStatus.ACTIVE,
              createdByUserId: user.id,
            },
            select: { id: true },
          });

          createdBankAccountIds.push(bankAccount.id);
        }

        return tx.bankAccount.findMany({
          where: { id: { in: createdBankAccountIds } },
          include: BankAccountInclude,
          orderBy: [{ bankName: 'asc' }, { id: 'asc' }],
        });
      }, BankMasterfileTransactionOptions);

      return {
        message: `${bankAccounts.length} bank account${bankAccounts.length === 1 ? '' : 's'} imported successfully.`,
        bankAccounts: bankAccounts.map(mapBankAccount),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }
  async update(user: AuthUser, id: string, dto: UpdateBankAccountDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const bankAccountId = parseBigIntId(id);
    const currentBankAccount = await this.findBankAccountOrThrow(
      companyId,
      bankAccountId,
    );

    if (dto.accountCode !== undefined) {
      throw new BadRequestException('Account code cannot be changed here.');
    }

    this.validateBankInput({ ...this.toDtoLike(currentBankAccount), ...dto });
    await this.ensureBankAccountAvailable(companyId, dto, bankAccountId);

    try {
      const bankAccount = await this.prisma.$transaction(async (tx) => {
        const nextAccountName = this.resolveAccountName({
          ...this.toDtoLike(currentBankAccount),
          ...dto,
        });

        if (dto.isDefault === true) {
          await tx.bankAccount.updateMany({
            where: { companyId, id: { not: bankAccountId }, isDefault: true },
            data: { isDefault: false },
          });
        }

        const updatedBankAccount = await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            ...this.toUpdateBankAccountData(dto, nextAccountName),
            updatedByUserId: user.id,
          },
          include: BankAccountInclude,
        });

        await tx.chartAccount.update({
          where: { id: updatedBankAccount.coaId },
          data: {
            accountTitle: nextAccountName,
            currencyCode:
              dto.currencyCode !== undefined
                ? cleanCurrencyCode(dto.currencyCode)
                : undefined,
            status: dto.status,
            whoModified: String(user.id),
          },
        });

        return tx.bankAccount.findUniqueOrThrow({
          where: { id: bankAccountId },
          include: BankAccountInclude,
        });
      }, BankMasterfileTransactionOptions);

      return {
        message: 'Bank account updated successfully.',
        bankAccount: mapBankAccount(bankAccount),
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    dto: UpdateBankAccountStatusDto,
  ) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    const bankAccountId = parseBigIntId(id);
    const currentBankAccount = await this.findBankAccountOrThrow(
      companyId,
      bankAccountId,
    );

    const bankAccount = await this.prisma.$transaction(async (tx) => {
      await tx.chartAccount.update({
        where: { id: currentBankAccount.coaId },
        data: {
          status: dto.status,
          deletedAt:
            dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
          whoModified: String(user.id),
        },
      });

      return tx.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: BankAccountInclude,
      });
    }, BankMasterfileTransactionOptions);

    return {
      message:
        dto.status === ChartAccountStatus.ACTIVE
          ? 'Bank account activated successfully.'
          : 'Bank account inactivated successfully.',
      bankAccount: mapBankAccount(bankAccount),
    };
  }

  private buildListWhere(
    companyId: number,
    query: GetBankAccountListQueryDto,
  ): Prisma.BankAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { bankName: { contains: search, mode: 'insensitive' } },
              { branch: { contains: search, mode: 'insensitive' } },
              { accountName: { contains: search, mode: 'insensitive' } },
              { accountNumber: { contains: search, mode: 'insensitive' } },
              {
                coa: {
                  accountCode: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(
    query: GetBankAccountListQueryDto,
  ): Prisma.BankAccountOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'bankName';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  async getStatistics(companyId: number) {
    const [groups, defaultBanks] = await Promise.all([
      this.prisma.bankAccount.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),
      this.prisma.bankAccount.count({ where: { companyId, isDefault: true } }),
    ]);

    return {
      totalBanks: groups.reduce((total, group) => total + group._count._all, 0),
      activeBanks:
        groups.find((group) => group.status === ChartAccountStatus.ACTIVE)
          ?._count._all ?? 0,
      inactiveBanks:
        groups.find((group) => group.status === ChartAccountStatus.INACTIVE)
          ?._count._all ?? 0,
      defaultBanks,
    };
  }

  private async findCashInBankParentOrThrow(
    companyId: number,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const accounts = await tx.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        accountLevel: { not: ChartAccountLevel.SPECIFIC },
        OR: [
          { accountTitle: { contains: 'cash', mode: 'insensitive' } },
          { accountTitle: { contains: 'bank', mode: 'insensitive' } },
          { accountGroup: { contains: 'cash', mode: 'insensitive' } },
          { accountGroup: { contains: 'bank', mode: 'insensitive' } },
          { reportAlias: { contains: 'cash', mode: 'insensitive' } },
          { reportAlias: { contains: 'bank', mode: 'insensitive' } },
          { class: { contains: 'cash', mode: 'insensitive' } },
          { class: { contains: 'bank', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ accountCode: 'asc' }],
    });
    const account = pickCashInBankParent(accounts);

    if (!account) {
      throw new BadRequestException(
        'Cannot create bank account. Cash in Bank group was not found in Chart of Accounts. Please set up the Cash in Bank group first.',
      );
    }

    return account;
  }

  private async generateNextCashInBankAccountCode(
    companyId: number,
    parentAccountId: bigint,
    parentAccountCode: string,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    const siblings = await tx.chartAccount.findMany({
      where: {
        companyId,
        parentAccountId,
        accountLevel: ChartAccountLevel.SPECIFIC,
      },
      select: { accountCode: true },
      orderBy: { accountCode: 'asc' },
    });

    return generateNextAccountCodeFromSiblings({
      parentCode: parentAccountCode,
      accountLevel: ChartAccountLevel.SPECIFIC,
      siblingCodes: siblings.map((sibling) => sibling.accountCode),
    });
  }

  private async validateManualAccountCode(
    companyId: number,
    accountCode: string,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    const normalizedAccountCode = accountCode.trim();
    const existingAccount = await tx.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: normalizedAccountCode,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException(
        'A chart account with this account code already exists.',
      );
    }

    return normalizedAccountCode;
  }

  private validateBankInput(dto: CreateBankAccountDto | UpdateBankAccountDto) {
    const bankName = dto.bankName?.trim();
    const accountNumber = dto.accountNumber?.trim();

    if (!bankName) {
      throw new BadRequestException('Bank is required.');
    }

    if (!accountNumber) {
      throw new BadRequestException('Bank account number is required.');
    }

    if (
      dto.seriesStart !== undefined &&
      dto.seriesEnd !== undefined &&
      dto.seriesStart.trim() &&
      dto.seriesEnd.trim() &&
      Number(dto.seriesStart) > Number(dto.seriesEnd)
    ) {
      throw new BadRequestException(
        'Series start should not be greater than series end.',
      );
    }

    const currencyCode = cleanCurrencyCode(dto.currencyCode);
    if (
      currencyCode &&
      currencyCode !== BaseCurrencyCode &&
      (!dto.currencyExchangeRate || dto.currencyExchangeRate <= 0)
    ) {
      throw new BadRequestException(
        'Currency exchange rate must be greater than 0 for non-PHP bank accounts.',
      );
    }
  }

  private async ensureBankAccountAvailable(
    companyId: number,
    dto: CreateBankAccountDto | UpdateBankAccountDto,
    excludedBankAccountId?: bigint,
  ) {
    if (!dto.bankName || !dto.accountNumber) {
      return;
    }

    const existingBankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        companyId,
        id: excludedBankAccountId ? { not: excludedBankAccountId } : undefined,
        bankName: { equals: dto.bankName.trim(), mode: 'insensitive' },
        accountNumber: {
          equals: dto.accountNumber.trim(),
          mode: 'insensitive',
        },
        ...(cleanOptional(dto.branch) === null
          ? { branch: null }
          : { branch: { equals: dto.branch?.trim(), mode: 'insensitive' } }),
      },
      select: { id: true },
    });

    if (existingBankAccount) {
      throw new ConflictException(
        'A bank account with the same bank, branch, and account number already exists.',
      );
    }
  }
  private ensureNoDuplicateImportedBankAccounts(banks: CreateBankAccountDto[]) {
    const seenKeys = new Set<string>();

    for (const bank of banks) {
      const key = getBankAccountIdentityKey(bank);

      if (seenKeys.has(key)) {
        throw new ConflictException(
          `Duplicate bank account in import: ${bank.bankName.trim()} ${bank.accountNumber.trim()}.`,
        );
      }

      seenKeys.add(key);
    }
  }

  private ensureNoDuplicateImportedAccountCodes(banks: CreateBankAccountDto[]) {
    const seenCodes = new Set<string>();

    for (const bank of banks) {
      const accountCode = bank.accountCode?.trim();

      if (!accountCode) {
        continue;
      }

      if (seenCodes.has(accountCode)) {
        throw new ConflictException(
          `Duplicate account code in import: ${accountCode}.`,
        );
      }

      seenCodes.add(accountCode);
    }
  }

  private ensureAtMostOneDefaultImportedBank(banks: CreateBankAccountDto[]) {
    const defaultBanks = banks.filter((bank) => bank.isDefault === true);

    if (defaultBanks.length > 1) {
      throw new BadRequestException(
        'Only one imported bank account can be marked as default.',
      );
    }
  }

  private async ensureImportedBankAccountsAvailable(
    companyId: number,
    banks: CreateBankAccountDto[],
  ) {
    const importKeys = new Set(banks.map(getBankAccountIdentityKey));
    const existingBankAccounts = await this.prisma.bankAccount.findMany({
      where: { companyId },
      select: {
        bankName: true,
        branch: true,
        accountNumber: true,
      },
    });
    const existingBankAccount = existingBankAccounts.find((bank) =>
      importKeys.has(getBankAccountIdentityKey(bank)),
    );

    if (existingBankAccount) {
      throw new ConflictException(
        `Bank account already exists: ${existingBankAccount.bankName} ${existingBankAccount.accountNumber}.`,
      );
    }
  }

  private async ensureImportedAccountCodesAvailable(
    companyId: number,
    banks: CreateBankAccountDto[],
  ) {
    const accountCodes = banks
      .map((bank) => bank.accountCode?.trim())
      .filter((accountCode): accountCode is string => Boolean(accountCode));

    if (accountCodes.length === 0) {
      return;
    }

    const existingAccount = await this.prisma.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: { in: accountCodes },
        deletedAt: null,
      },
      select: { accountCode: true },
    });

    if (existingAccount) {
      throw new ConflictException(
        `Chart account code already exists: ${existingAccount.accountCode}.`,
      );
    }
  }
  private async findBankAccountOrThrow(
    companyId: number,
    bankAccountId: bigint,
  ) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId },
      include: BankAccountInclude,
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found.');
    }

    return bankAccount;
  }

  private resolveAccountName(dto: CreateBankAccountDto | UpdateBankAccountDto) {
    const explicitName = dto.accountName?.trim();

    if (explicitName) {
      return explicitName;
    }

    return [
      'Cash in Bank',
      dto.bankName?.trim(),
      dto.branch?.trim(),
      dto.accountNumber?.trim(),
    ]
      .filter(Boolean)
      .join(' - ');
  }

  private toCreateBankAccountData(
    dto: CreateBankAccountDto,
    accountName: string,
  ) {
    return {
      bankName: dto.bankName.trim(),
      branch: cleanOptional(dto.branch),
      accountNumber: dto.accountNumber.trim(),
      accountName,
      accountType: cleanOptional(dto.accountType),
      seriesStart: cleanOptional(dto.seriesStart),
      seriesEnd: cleanOptional(dto.seriesEnd),
      seriesDigits: dto.seriesDigits,
      currencyCode: cleanCurrencyCode(dto.currencyCode),
      currencyExchangeRate:
        dto.currencyExchangeRate === undefined
          ? undefined
          : new Prisma.Decimal(dto.currencyExchangeRate),
      isDefault: dto.isDefault ?? false,
    };
  }

  private toUpdateBankAccountData(
    dto: UpdateBankAccountDto,
    accountName: string,
  ): Prisma.BankAccountUpdateInput {
    return {
      ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() } : {}),
      ...(dto.branch !== undefined
        ? { branch: cleanOptional(dto.branch) }
        : {}),
      ...(dto.accountNumber !== undefined
        ? { accountNumber: dto.accountNumber.trim() }
        : {}),
      ...(dto.accountName !== undefined ||
      dto.bankName !== undefined ||
      dto.branch !== undefined ||
      dto.accountNumber !== undefined
        ? { accountName }
        : {}),
      ...(dto.accountType !== undefined
        ? { accountType: cleanOptional(dto.accountType) }
        : {}),
      ...(dto.seriesStart !== undefined
        ? { seriesStart: cleanOptional(dto.seriesStart) }
        : {}),
      ...(dto.seriesEnd !== undefined
        ? { seriesEnd: cleanOptional(dto.seriesEnd) }
        : {}),
      ...(dto.seriesDigits !== undefined
        ? { seriesDigits: dto.seriesDigits }
        : {}),
      ...(dto.currencyCode !== undefined
        ? { currencyCode: cleanCurrencyCode(dto.currencyCode) }
        : {}),
      ...(dto.currencyExchangeRate !== undefined
        ? { currencyExchangeRate: new Prisma.Decimal(dto.currencyExchangeRate) }
        : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private toDtoLike(
    bankAccount: Awaited<
      ReturnType<BankMasterfileService['findBankAccountOrThrow']>
    >,
  ) {
    return {
      bankName: bankAccount.bankName,
      branch: bankAccount.branch ?? undefined,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      accountType: bankAccount.accountType ?? undefined,
      seriesStart: bankAccount.seriesStart ?? undefined,
      seriesEnd: bankAccount.seriesEnd ?? undefined,
      seriesDigits: bankAccount.seriesDigits ?? undefined,
      currencyCode: bankAccount.currencyCode ?? undefined,
      currencyExchangeRate: bankAccount.currencyExchangeRate
        ? Number(bankAccount.currencyExchangeRate)
        : undefined,
      isDefault: bankAccount.isDefault,
      status: bankAccount.status,
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
      user.permissions.includes(`${PermissionCodes.BANK_MASTERFILE}:${action}`)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage bank masterfile records.',
    );
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

    return (
      user.companyId === companyId &&
      user.permissions.includes(`${PermissionCodes.BANK_MASTERFILE}:${action}`)
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
        'This bank masterfile record already exists.',
      );
    }
  }
}

type CashInBankCandidate = Pick<
  Prisma.ChartAccountGetPayload<object>,
  'accountTitle' | 'accountGroup' | 'reportAlias' | 'class'
>;

function pickCashInBankParent<T extends CashInBankCandidate>(accounts: T[]) {
  let bestAccount: T | null = null;
  let bestScore = 0;

  for (const account of accounts) {
    const score = scoreCashInBankCandidate(account);

    if (score > bestScore) {
      bestAccount = account;
      bestScore = score;
    }
  }

  return bestAccount;
}

function scoreCashInBankCandidate(account: CashInBankCandidate) {
  const labels = [
    account.accountTitle,
    account.accountGroup,
    account.reportAlias,
    account.class,
  ].map(normalizeAccountLabel);

  if (labels.some((label) => label === 'cash in bank')) {
    return 100;
  }

  if (labels.some((label) => label.includes('cash in bank'))) {
    return 90;
  }

  if (labels.some((label) => label.includes('cash') && label.includes('bank'))) {
    return 80;
  }

  if (labels.some((label) => label.includes('cash and cash equivalent'))) {
    return 40;
  }

  if (labels.some((label) => label.includes('bank'))) {
    return 20;
  }

  return 0;
}

function normalizeAccountLabel(value: string | null) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() ?? '';
}
type BankAccountIdentity = {
  bankName: string;
  branch?: string | null;
  accountNumber: string;
};

function getBankAccountIdentityKey(bank: BankAccountIdentity) {
  return [bank.bankName, bank.branch ?? '', bank.accountNumber]
    .map((value) => normalizeIdentityValue(value))
    .join('|');
}

function normalizeIdentityValue(value: string) {
  return value.trim().toLowerCase();
}
function cleanOptional(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  return value.trim() || null;
}

function cleanCurrencyCode(value: string | null | undefined) {
  return cleanOptional(value)?.toUpperCase() ?? null;
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
