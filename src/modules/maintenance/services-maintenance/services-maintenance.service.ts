import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, ServiceAccountSetupMode } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateServiceMaintenanceDto } from './dto/create-service-maintenance.dto';
import { GetServiceMaintenanceListQueryDto } from './dto/get-service-maintenance-list-query.dto';
import { UpdateServiceMaintenanceStatusDto } from './dto/update-service-maintenance-status.dto';
import { UpdateServiceMaintenanceDto } from './dto/update-service-maintenance.dto';
import { mapServicesMaintenanceWithAuditUsers } from './mappers/service-maintenance.mapper';
import { ServiceMaintenanceInclude } from './prisma/service-maintenance.include';
import type { ServicesMaintenancePrismaClient } from './types/service-maintenance.type';
import {
  buildServiceMaintenanceListWhere,
  buildServiceMaintenanceOrderBy,
  resolveServiceRevenueAccountTitle,
  toCreateServiceMaintenanceData,
  toUpdateServiceMaintenanceData,
  validateServiceMaintenanceInput,
} from './utils/service-maintenance-data.util';
import {
  accountGroupHasTag,
  buildServiceRevenueAccountGroupTags,
  findSelectableServiceRevenueAccountOrThrow,
  findServiceRevenueParentOrThrow,
  generateNextServiceRevenueAccountCode,
  ServiceRevenueAccountGroupTag,
} from './utils/service-maintenance-account.util';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
import { normalizeWhitespace } from '../../../common/utils/string-normalization.util';
const ServicesMaintenanceModuleCode = 'SM';

@Injectable()
export class ServicesMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetServiceMaintenanceListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.VIEW, 'You do not have permission to manage service records.');

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = buildServiceMaintenanceListWhere(companyId, query);
    const orderBy = buildServiceMaintenanceOrderBy(query);

    const [services, total, statistics] = await Promise.all([
      this.prisma.serviceMaintenance.findMany({
        where,
        include: ServiceMaintenanceInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.serviceMaintenance.count({ where }),
      this.getStatistics(companyId),
    ]);

    return {
      services: await mapServicesMaintenanceWithAuditUsers(this.prisma, services),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: getModulePermissions(user, companyId, ServicesMaintenanceModuleCode, { includeImport: true }),
    };
  }

  async findOptions(user: AuthUser, query: GetServiceMaintenanceListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const search = query.search?.trim();

    const services = await this.prisma.serviceMaintenance.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
        ...(search ? { serviceName: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        serviceName: true,
        status: true,
      },
      orderBy: [{ serviceName: 'asc' }, { id: 'asc' }],
    });

    return {
      services: services.map((service) => ({
        id: service.id.toString(),
        serviceName: service.serviceName,
        name: service.serviceName,
        status: service.status,
      })),
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.VIEW, 'You do not have permission to manage service records.');
    const service = await this.findServiceOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      service: (await mapServicesMaintenanceWithAuditUsers(this.prisma, [service]))[0],
      permissions: getModulePermissions(user, companyId, ServicesMaintenanceModuleCode, { includeImport: true }),
    };
  }

  async getAccountOptions(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.VIEW, 'You do not have permission to manage service records.');

    return {
      accounts: await this.findAccountOptions(companyId),
    };
  }

  async getNextAccountCode(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.CREATE, 'You do not have permission to manage service records.');

    const parent = await findServiceRevenueParentOrThrow(companyId, this.prisma);
    const accountCode = await generateNextServiceRevenueAccountCode(companyId, parent.id, parent.accountCode, this.prisma);

    return {
      accountCode,
      parentAccountId: parent.id.toString(),
      parentAccountCode: parent.accountCode,
      parentAccountLevel: parent.accountLevel,
      parentAccountTitle: parent.accountTitle,
    };
  }

  async create(user: AuthUser, dto: CreateServiceMaintenanceDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.CREATE, 'You do not have permission to manage service records.');
    validateServiceMaintenanceInput(dto);
    const serviceName = this.validateServiceName(dto.serviceName);
    await this.ensureServiceNameAvailable(companyId, serviceName);

    try {
      const service = await this.prisma.$transaction(async (tx) => {
        const requestedStatus = dto.status ?? ChartAccountStatus.ACTIVE;
        const revenueAccount =
          dto.accountSetupMode === ServiceAccountSetupMode.EXISTING
            ? await findSelectableServiceRevenueAccountOrThrow(companyId, dto.revenueCoaId ?? '', tx)
            : await this.createGeneratedRevenueAccount(companyId, serviceName, requestedStatus, tx, user.id);

        return tx.serviceMaintenance.create({
          data: {
            companyId,
            ...toCreateServiceMaintenanceData(dto, revenueAccount.id, dto.accountSetupMode === ServiceAccountSetupMode.AUTO),
            serviceName,
            status: requestedStatus,
            createdByUserId: user.id,
          },
          include: ServiceMaintenanceInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Service created successfully.',
        service: (await mapServicesMaintenanceWithAuditUsers(this.prisma, [service]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'A service with this name already exists.');
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateServiceMaintenanceDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.UPDATE, 'You do not have permission to manage service records.');
    validateServiceMaintenanceInput(dto);
    const serviceId = parsePositiveBigIntId(id);
    const currentService = await this.findServiceOrThrow(companyId, serviceId);
    const nextServiceName = dto.serviceName === undefined ? currentService.serviceName : this.validateServiceName(dto.serviceName);

    if (nextServiceName !== currentService.serviceName) {
      await this.ensureServiceNameAvailable(companyId, nextServiceName, serviceId);
    }

    try {
      const service = await this.prisma.$transaction(async (tx) => {
        const requestedStatus = dto.status ?? currentService.status;
        const nextSetupMode = dto.accountSetupMode ?? currentService.accountSetupMode;
        let revenueCoaId: bigint | undefined;
        let isGeneratedRevenueAccount: boolean | undefined;

        if (nextSetupMode === ServiceAccountSetupMode.EXISTING) {
          if (currentService.isGeneratedRevenueAccount && dto.revenueCoaId === undefined) {
            throw new BadRequestException('Select an existing revenue account before changing account setup.');
          }

          const revenueAccount =
            dto.revenueCoaId !== undefined
              ? await findSelectableServiceRevenueAccountOrThrow(companyId, dto.revenueCoaId ?? '', tx)
              : currentService.revenueCoa;

          await this.ensureSelectedRevenueAccountIsValid(companyId, revenueAccount.id, tx);
          revenueCoaId = revenueAccount.id;
          isGeneratedRevenueAccount = false;
        }

        if (nextSetupMode === ServiceAccountSetupMode.AUTO) {
          if (currentService.isGeneratedRevenueAccount) {
            revenueCoaId = currentService.revenueCoaId;
            isGeneratedRevenueAccount = true;
            await tx.chartAccount.update({
              where: { id: currentService.revenueCoaId },
              data: {
                accountTitle: resolveServiceRevenueAccountTitle(nextServiceName),
                status: requestedStatus,
                deletedAt: requestedStatus === ChartAccountStatus.INACTIVE ? new Date() : null,
                whoModified: String(user.id),
              },
            });
          } else {
            const generatedAccount = await this.createGeneratedRevenueAccount(companyId, nextServiceName, requestedStatus, tx, user.id);
            revenueCoaId = generatedAccount.id;
            isGeneratedRevenueAccount = true;
          }
        }

        if (currentService.isGeneratedRevenueAccount && nextSetupMode === ServiceAccountSetupMode.EXISTING) {
          await tx.chartAccount.update({
            where: { id: currentService.revenueCoaId },
            data: {
              status: ChartAccountStatus.INACTIVE,
              deletedAt: new Date(),
              whoModified: String(user.id),
            },
          });
        }

        if (currentService.isGeneratedRevenueAccount && dto.status !== undefined && nextSetupMode !== ServiceAccountSetupMode.AUTO) {
          await tx.chartAccount.update({
            where: { id: currentService.revenueCoaId },
            data: {
              status: dto.status,
              deletedAt: dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
              whoModified: String(user.id),
            },
          });
        }

        return tx.serviceMaintenance.update({
          where: { id: serviceId },
          data: {
            ...toUpdateServiceMaintenanceData(dto, revenueCoaId, isGeneratedRevenueAccount),
            serviceName: nextServiceName,
            status: requestedStatus,
            updatedByUserId: user.id,
          },
          include: ServiceMaintenanceInclude,
        });
      }, MaintenanceTransactionOptions);

      return {
        message: 'Service updated successfully.',
        service: (await mapServicesMaintenanceWithAuditUsers(this.prisma, [service]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'A service with this name already exists.');
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateServiceMaintenanceStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.UPDATE, 'You do not have permission to manage service records.');
    const serviceId = parsePositiveBigIntId(id);
    const currentService = await this.findServiceOrThrow(companyId, serviceId);

    const service = await this.prisma.$transaction(async (tx) => {
      if (currentService.isGeneratedRevenueAccount) {
        await tx.chartAccount.update({
          where: { id: currentService.revenueCoaId },
          data: {
            status: dto.status,
            deletedAt: dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
            whoModified: String(user.id),
          },
        });
      }

      return tx.serviceMaintenance.update({
        where: { id: serviceId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: ServiceMaintenanceInclude,
      });
    }, MaintenanceTransactionOptions);

    return {
      message: dto.status === ChartAccountStatus.ACTIVE ? 'Service activated successfully.' : 'Service inactivated successfully.',
      service: (await mapServicesMaintenanceWithAuditUsers(this.prisma, [service]))[0],
    };
  }

  private async createGeneratedRevenueAccount(
    companyId: number,
    serviceName: string,
    status: ChartAccountStatus,
    tx: ServicesMaintenancePrismaClient,
    userId: number,
  ) {
    const parent = await findServiceRevenueParentOrThrow(companyId, tx);
    const accountCode = await generateNextServiceRevenueAccountCode(companyId, parent.id, parent.accountCode, tx);

    return tx.chartAccount.create({
      data: {
        companyId,
        parentAccountId: parent.id,
        accountCode,
        accountTitle: resolveServiceRevenueAccountTitle(serviceName),
        accountLevel: ChartAccountLevel.SPECIFIC,
        accountType: ChartAccountType.REVENUE,
        accountNature: AccountNature.CREDIT,
        accountGroup: buildServiceRevenueAccountGroupTags(),
        statementSection: parent.statementSection,
        reportAlias: parent.reportAlias,
        isPostingAccount: true,
        status,
        deletedAt: status === ChartAccountStatus.INACTIVE ? new Date() : null,
        whoCreated: String(userId),
      },
    });
  }

  private async findAccountOptions(companyId: number) {
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        accountLevel: ChartAccountLevel.SPECIFIC,
        accountType: ChartAccountType.REVENUE,
        accountNature: AccountNature.CREDIT,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
      orderBy: [{ accountCode: 'asc' }],
    });

    return accounts
      .filter((account) => accountGroupHasTag(account.accountGroup, ServiceRevenueAccountGroupTag))
      .map((account) => ({
        id: account.id.toString(),
        accountNumber: account.accountCode,
        accountName: account.accountTitle,
        description: account.description ?? '',
        accountType: account.accountType ?? '',
        accountCategory: account.accountLevel === ChartAccountLevel.SPECIFIC ? 'Detail' : 'Header',
        status: account.status === ChartAccountStatus.ACTIVE ? 'Active' : 'Inactive',
      }));
  }

  private async ensureSelectedRevenueAccountIsValid(companyId: number, revenueCoaId: bigint, tx: ServicesMaintenancePrismaClient) {
    await findSelectableServiceRevenueAccountOrThrow(companyId, revenueCoaId.toString(), tx);
  }

  private async getStatistics(companyId: number) {
    const [statusGroups, accountTitleGroups] = await Promise.all([
      this.prisma.serviceMaintenance.groupBy({
        by: ['status'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.serviceMaintenance.groupBy({
        by: ['revenueCoaId'],
        where: { companyId, deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    return {
      totalServices: statusGroups.reduce((total, group) => total + group._count._all, 0),
      activeServices: statusGroups.filter((group) => group.status === ChartAccountStatus.ACTIVE).reduce((total, group) => total + group._count._all, 0),
      inactiveServices: statusGroups.filter((group) => group.status === ChartAccountStatus.INACTIVE).reduce((total, group) => total + group._count._all, 0),
      accountTitles: accountTitleGroups.length,
    };
  }

  private async findServiceOrThrow(companyId: number, serviceId: bigint) {
    const service = await this.prisma.serviceMaintenance.findFirst({
      where: { id: serviceId, companyId, deletedAt: null },
      include: ServiceMaintenanceInclude,
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  private validateServiceName(value: string) {
    const serviceName = normalizeWhitespace(value);

    if (!serviceName) {
      throw new BadRequestException('Service name is required.');
    }

    return serviceName;
  }

  private async ensureServiceNameAvailable(companyId: number, serviceName: string, excludedServiceId?: bigint) {
    const existingService = await this.prisma.serviceMaintenance.findFirst({
      where: {
        companyId,
        id: excludedServiceId ? { not: excludedServiceId } : undefined,
        serviceName: { equals: serviceName, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingService) {
      throw new ConflictException('A service with this name already exists.');
    }
  }
}
