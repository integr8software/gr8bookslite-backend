import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChartAccountStatus, ChartAccountType, MembershipRole, MembershipStatus, Prisma, TaxMaintenanceStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { accountGroupHasTag, SystemAccountGroupTags } from '../chart-of-accounts/utils/system-account-groups.util';
import { TaxMaintenanceInclude } from './prisma/tax-maintenance.include';
import { seedCompanyTaxMaintenanceDefaults } from './seed/tax-maintenance.seed';
import type { TaxMaintenanceWithAccounts } from './types/tax-maintenance-with-accounts.type';
import { buildTaxMaintenanceAccountingAccountOptions } from './utils/tax-maintenance-accounting-account.util';
import { CreateTaxMaintenanceDto } from './dto/create-tax-maintenance.dto';
import { GetTaxMaintenanceListQueryDto } from './dto/get-tax-maintenance-list-query.dto';
import { UpdateTaxMaintenanceDto } from './dto/update-tax-maintenance.dto';
import { mapTaxMaintenance } from './mappers/tax-maintenance.mapper';

const TaxMaintenanceModuleCode = 'TXM';
const TaxesPayablesAccountTitle = 'Taxes Payables';
const TaxesPayablesAccountGroupTag = SystemAccountGroupTags.taxMaintenanceTaxesPayablesGroup;

@Injectable()
export class TaxMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetTaxMaintenanceListQueryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.VIEW);
    await this.ensureDefaultRows(companyId);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(companyId, query);
    const orderBy = this.buildOrderBy(query);

    const [taxMaintenance, total, statistics, accountingOptions] = await Promise.all([
      this.prisma.taxMaintenance.findMany({
        where,
        include: TaxMaintenanceInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.taxMaintenance.count({ where }),
      this.getStatistics(companyId),
      this.getAccountingOptions(companyId),
    ]);

    return {
      taxMaintenance: await this.mapTaxMaintenanceWithAuditUsers(taxMaintenance),
      ...accountingOptions,
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
    await this.ensureDefaultRows(companyId);

    const tax = await this.findTaxMaintenanceOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      taxMaintenance: (await this.mapTaxMaintenanceWithAuditUsers([tax]))[0],
      permissions: this.getPermissions(user, companyId),
    };
  }

  async create(user: AuthUser, dto: CreateTaxMaintenanceDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.CREATE);
    await this.ensureDefaultRows(companyId);
    await this.ensureNameAvailable(companyId, dto.name);
    await this.ensureChartAccountsBelongToCompany(companyId, dto);

    try {
      const tax = await this.prisma.taxMaintenance.create({
        data: {
          companyId,
          ...this.toCreateTaxMaintenanceData(dto),
          status: dto.status ?? TaxMaintenanceStatus.ACTIVE,
          createdByUserId: user.id,
        },
        include: TaxMaintenanceInclude,
      });

      return {
        message: 'Tax maintenance record created successfully.',
        taxMaintenance: (await this.mapTaxMaintenanceWithAuditUsers([tax]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateTaxMaintenanceDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    this.ensureCan(user, companyId, PermissionAction.UPDATE);
    await this.ensureDefaultRows(companyId);
    const taxMaintenanceId = parsePositiveBigIntId(id);

    await this.findTaxMaintenanceOrThrow(companyId, taxMaintenanceId);

    if (dto.name !== undefined) {
      await this.ensureNameAvailable(companyId, dto.name, taxMaintenanceId);
    }
    await this.ensureChartAccountsBelongToCompany(companyId, dto);

    try {
      const tax = await this.prisma.taxMaintenance.update({
        where: { id: taxMaintenanceId },
        data: {
          ...this.toTaxMaintenanceData(dto),
          updatedByUserId: user.id,
        },
        include: TaxMaintenanceInclude,
      });

      return {
        message: 'Tax maintenance record updated successfully.',
        taxMaintenance: (await this.mapTaxMaintenanceWithAuditUsers([tax]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  private buildListWhere(companyId: number, query: GetTaxMaintenanceListQueryDto): Prisma.TaxMaintenanceWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetTaxMaintenanceListQueryDto): Prisma.TaxMaintenanceOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics(companyId: number) {
    return this.prisma.taxMaintenance
      .groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      })
      .then((groups) => {
        const statistics = {
          totalTaxes: 0,
          activeTaxes: 0,
          inactiveTaxes: 0,
        };

        for (const group of groups) {
          const count = group._count._all;
          statistics.totalTaxes += count;
          if (group.status === TaxMaintenanceStatus.ACTIVE) {
            statistics.activeTaxes += count;
          }
          if (group.status === TaxMaintenanceStatus.INACTIVE) {
            statistics.inactiveTaxes += count;
          }
        }

        return statistics;
      });
  }

  private async mapTaxMaintenanceWithAuditUsers(taxes: TaxMaintenanceWithAccounts[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      taxes.flatMap((tax) => [tax.createdByUserId, tax.updatedByUserId]),
    );

    return taxes.map((tax) => mapTaxMaintenance(tax, userNames));
  }

  private toCreateTaxMaintenanceData(dto: CreateTaxMaintenanceDto) {
    return {
      name: dto.name.trim(),
      description: cleanOptional(dto.description),
      percentage: new Prisma.Decimal(dto.percentage),
      inputVatAccountId: parseOptionalPositiveBigIntId(dto.inputVatAccountId),
      outputVatAccountId: parseOptionalPositiveBigIntId(dto.outputVatAccountId),
      deferredVatAccountId: parseOptionalPositiveBigIntId(dto.deferredVatAccountId),
      expandedWithholdingTaxAccountId: parseOptionalPositiveBigIntId(dto.expandedWithholdingTaxAccountId),
      creditableWithholdingTaxAccountId: parseOptionalPositiveBigIntId(dto.creditableWithholdingTaxAccountId),
      withholdingVatableTaxAccountId: parseOptionalPositiveBigIntId(dto.withholdingVatableTaxAccountId),
      finalWithholdingTaxAccountId: parseOptionalPositiveBigIntId(dto.finalWithholdingTaxAccountId),
    };
  }

  private toTaxMaintenanceData(dto: UpdateTaxMaintenanceDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: cleanOptional(dto.description) } : {}),
      ...(dto.percentage !== undefined ? { percentage: new Prisma.Decimal(dto.percentage) } : {}),
      ...(dto.inputVatAccountId !== undefined
        ? {
            inputVatAccountId: parseOptionalPositiveBigIntId(dto.inputVatAccountId),
          }
        : {}),
      ...(dto.outputVatAccountId !== undefined
        ? {
            outputVatAccountId: parseOptionalPositiveBigIntId(dto.outputVatAccountId),
          }
        : {}),
      ...(dto.deferredVatAccountId !== undefined
        ? {
            deferredVatAccountId: parseOptionalPositiveBigIntId(dto.deferredVatAccountId),
          }
        : {}),
      ...(dto.expandedWithholdingTaxAccountId !== undefined
        ? {
            expandedWithholdingTaxAccountId: parseOptionalPositiveBigIntId(dto.expandedWithholdingTaxAccountId),
          }
        : {}),
      ...(dto.creditableWithholdingTaxAccountId !== undefined
        ? {
            creditableWithholdingTaxAccountId: parseOptionalPositiveBigIntId(dto.creditableWithholdingTaxAccountId),
          }
        : {}),
      ...(dto.withholdingVatableTaxAccountId !== undefined
        ? {
            withholdingVatableTaxAccountId: parseOptionalPositiveBigIntId(dto.withholdingVatableTaxAccountId),
          }
        : {}),
      ...(dto.finalWithholdingTaxAccountId !== undefined
        ? {
            finalWithholdingTaxAccountId: parseOptionalPositiveBigIntId(dto.finalWithholdingTaxAccountId),
          }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
  }

  private async ensureDefaultRows(companyId: number) {
    await this.prisma.$transaction((tx) => seedCompanyTaxMaintenanceDefaults(tx, companyId));
  }

  private async getAccountingOptions(companyId: number) {
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
    });

    return buildTaxMaintenanceAccountingAccountOptions(accounts);
  }

  private async ensureNameAvailable(companyId: number, name: string, excludedTaxMaintenanceId?: bigint) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Tax name is required.');
    }

    const existingTax = await this.prisma.taxMaintenance.findFirst({
      where: {
        companyId,
        deletedAt: null,
        id: excludedTaxMaintenanceId ? { not: excludedTaxMaintenanceId } : undefined,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingTax) {
      throw new ConflictException('A tax maintenance record with this name already exists.');
    }
  }

  private async ensureChartAccountsBelongToCompany(companyId: number, dto: CreateTaxMaintenanceDto | UpdateTaxMaintenanceDto) {
    const accountIds = [
      dto.inputVatAccountId,
      dto.outputVatAccountId,
      dto.deferredVatAccountId,
      dto.expandedWithholdingTaxAccountId,
      dto.creditableWithholdingTaxAccountId,
      dto.withholdingVatableTaxAccountId,
      dto.finalWithholdingTaxAccountId,
    ]
      .map((value) => parseOptionalPositiveBigIntId(value))
      .filter((value): value is bigint => value !== null);

    if (accountIds.length === 0) {
      return;
    }

    const uniqueAccountIds = [...new Set(accountIds)];
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        id: { in: uniqueAccountIds },
        companyId,
        deletedAt: null,
        accountType: ChartAccountType.LIABILITY,
        isPostingAccount: true,
        status: ChartAccountStatus.ACTIVE,
      },
      include: { parentAccount: true },
    });

    const validAccountIds = new Set(
      accounts
        .filter((account) => {
          const parent = account.parentAccount;

          return (
            parent?.companyId === companyId &&
            parent.deletedAt === null &&
            (accountGroupHasTag(parent.accountGroup, TaxesPayablesAccountGroupTag) || parent.accountTitle === TaxesPayablesAccountTitle)
          );
        })
        .map((account) => account.id.toString()),
    );

    if (accounts.length !== uniqueAccountIds.length || uniqueAccountIds.some((accountId) => !validAccountIds.has(accountId.toString()))) {
      throw new BadRequestException('Select active posting liability accounts under Taxes Payables.');
    }
  }

  private async findTaxMaintenanceOrThrow(companyId: number, taxMaintenanceId: bigint) {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: { id: taxMaintenanceId, companyId, deletedAt: null },
      include: TaxMaintenanceInclude,
    });

    if (!tax) {
      throw new NotFoundException('Tax maintenance record not found.');
    }

    return tax;
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
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  private ensureCan(user: AuthUser, companyId: number, action: PermissionAction) {
    if (this.hasReservedRoleAccess(user, companyId)) {
      return;
    }

    if (user.companyId === companyId && user.permissions.includes(`${TaxMaintenanceModuleCode}:${action}`)) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage tax maintenance.');
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

    return user.companyId === companyId && user.permissions.includes(`${TaxMaintenanceModuleCode}:${action}`);
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
      throw new ConflictException('A tax maintenance record with this name already exists.');
    }
  }
}
