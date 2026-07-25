import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxMaintenanceStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { resolveAuditUserNames } from '../../../common/utils/audit-user.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaxSortOrderStep } from '../constants/tax.constants';
import { CreateTaxDto } from '../dto/create-tax.dto';
import { GetTaxListQueryDto } from '../dto/get-tax-list-query.dto';
import { ReorderTaxesDto } from '../dto/reorder-taxes.dto';
import { UpdateTaxDto } from '../dto/update-tax.dto';
import { mapTax } from '../mappers/tax.mapper';
import { TaxInclude } from '../prisma/tax.include';
import type { TaxDetails } from '../types/tax-details.type';
import { buildCreateTaxData, buildUpdateTaxData, shouldCreateTaxRateVersion } from '../utils/tax-definition.util';
import { TaxAccessService } from './tax-access.service';
import { TaxCompanyConfigurationService } from './tax-company-configuration.service';
import { TaxRateService } from './tax-rate.service';

@Injectable()
export class TaxCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TaxAccessService,
    private readonly companyConfiguration: TaxCompanyConfigurationService,
    private readonly rates: TaxRateService,
  ) {}

  async findAll(user: AuthUser, query: GetTaxListQueryDto) {
    const companyId = this.access.getOptionalActiveCompanyId(user);
    if (companyId) {
      await this.access.assertCompanyAccess(user, companyId);
    }
    this.access.assertCan(user, PermissionAction.VIEW);

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const where = this.buildListWhere(query);
    const [taxes, total, statistics, accountingOptions] = await Promise.all([
      this.prisma.taxMaintenance.findMany({
        where,
        include: TaxInclude,
        orderBy: this.buildOrderBy(query),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxMaintenance.count({ where }),
      this.getStatistics(),
      companyId ? this.companyConfiguration.getAccountingOptions(companyId) : this.companyConfiguration.getEmptyAccountingOptions(),
    ]);

    return {
      taxes: await this.mapTaxesWithAuditUsers(taxes),
      ...accountingOptions,
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: this.access.getPermissions(user),
    };
  }

  async findOne(user: AuthUser, id: string) {
    this.access.assertCan(user, PermissionAction.VIEW);
    const tax = await this.findTaxOrThrow(parsePositiveBigIntId(id));

    return {
      tax: (await this.mapTaxesWithAuditUsers([tax]))[0],
      permissions: this.access.getPermissions(user),
    };
  }

  async reorder(user: AuthUser, dto: ReorderTaxesDto) {
    this.access.assertCan(user, PermissionAction.UPDATE);
    const taxIds = dto.taxIds.map((id) => parsePositiveBigIntId(id));
    if (new Set(taxIds.map(String)).size !== taxIds.length) {
      throw new BadRequestException('Each tax definition may only appear once in the display order.');
    }

    const taxes = await this.prisma.taxMaintenance.findMany({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    if (taxIds.length !== taxes.length) {
      throw new BadRequestException('Submit every tax definition when changing the display order.');
    }

    const existingIds = new Set(taxes.map(({ id }) => id.toString()));
    if (taxIds.some((id) => !existingIds.has(id.toString()))) {
      throw new BadRequestException('The tax display order contains an unknown or deleted tax definition.');
    }

    await this.prisma.$transaction(
      taxIds.map((id, index) =>
        this.prisma.taxMaintenance.update({
          where: { id },
          data: {
            sortOrder: (index + 1) * TaxSortOrderStep,
            updatedByUserId: user.id,
          },
        }),
      ),
    );

    return {
      message: 'Tax display order updated successfully.',
      taxIds: dto.taxIds,
    };
  }

  async create(user: AuthUser, dto: CreateTaxDto) {
    this.access.assertCan(user, PermissionAction.CREATE);
    await this.ensureCodeAvailable(dto.code);

    try {
      const tax = await this.prisma.$transaction(async (tx) => {
        const currentOrder = await tx.taxMaintenance.aggregate({
          where: { deletedAt: null },
          _max: { sortOrder: true },
        });
        const createdTax = await tx.taxMaintenance.create({
          data: {
            ...buildCreateTaxData(dto),
            sortOrder: (currentOrder._max.sortOrder ?? 0) + TaxSortOrderStep,
            status: dto.status ?? TaxMaintenanceStatus.ACTIVE,
            createdByUserId: user.id,
          },
          include: TaxInclude,
        });

        await this.rates.initializeCurrentRate(tx, createdTax);
        return createdTax;
      });

      return {
        message: 'Tax record created successfully.',
        tax: (await this.mapTaxesWithAuditUsers([tax]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateTaxDto) {
    this.access.assertCan(user, PermissionAction.UPDATE);
    const taxId = parsePositiveBigIntId(id);
    const currentTax = await this.findTaxOrThrow(taxId);

    if (dto.code !== undefined && dto.code.trim().toUpperCase() !== currentTax.code) {
      await this.ensureCodeAvailable(dto.code, taxId);
    }

    try {
      const tax = await this.prisma.$transaction(async (tx) => {
        const updatedTax = await tx.taxMaintenance.update({
          where: { id: taxId },
          data: {
            ...buildUpdateTaxData(dto, currentTax),
            updatedByUserId: user.id,
          },
        });

        if (shouldCreateTaxRateVersion(dto)) {
          await this.rates.synchronizeCurrentRate(tx, updatedTax);
        }

        return tx.taxMaintenance.findUniqueOrThrow({
          where: { id: taxId },
          include: TaxInclude,
        });
      });

      return {
        message: 'Tax record updated successfully.',
        tax: (await this.mapTaxesWithAuditUsers([tax]))[0],
      };
    } catch (error) {
      this.throwFriendlyPrismaError(error);
      throw error;
    }
  }

  private buildListWhere(query: GetTaxListQueryDto): Prisma.TaxMaintenanceWhereInput {
    const search = query.search?.trim();
    return {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              {
                jurisdictionCode: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(query: GetTaxListQueryDto): Prisma.TaxMaintenanceOrderByWithRelationInput[] {
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';
    return [{ [sortBy]: sortDirection }, { id: 'asc' }];
  }

  private getStatistics() {
    return this.prisma.taxMaintenance
      .groupBy({
        by: ['status'],
        where: { deletedAt: null },
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
          } else if (group.status === TaxMaintenanceStatus.INACTIVE) {
            statistics.inactiveTaxes += count;
          }
        }
        return statistics;
      });
  }

  private async mapTaxesWithAuditUsers(taxes: TaxDetails[]) {
    const userNames = await resolveAuditUserNames(
      this.prisma,
      taxes.flatMap((tax) => [tax.createdByUserId, tax.updatedByUserId]),
    );
    return taxes.map((tax) => mapTax(tax, userNames));
  }

  private async ensureCodeAvailable(code: string, excludedTaxId?: bigint) {
    const normalizedCode = code.trim().toUpperCase();
    const existingTax = await this.prisma.taxMaintenance.findFirst({
      where: {
        deletedAt: null,
        id: excludedTaxId ? { not: excludedTaxId } : undefined,
        code: { equals: normalizedCode, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (existingTax) {
      throw new ConflictException(`A tax definition with code ${normalizedCode} already exists.`);
    }
  }

  private async findTaxOrThrow(taxId: bigint) {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: { id: taxId, deletedAt: null },
      include: TaxInclude,
    });
    if (!tax) {
      throw new NotFoundException('Tax record not found.');
    }
    return tax;
  }

  private throwFriendlyPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A tax definition with this code already exists.');
    }
  }
}
