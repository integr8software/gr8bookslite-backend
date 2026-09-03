import { Injectable } from '@nestjs/common';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, ServiceMaintenanceType } from '@prisma/client';
import { PermissionAction } from '../../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetServiceMaintenanceListQueryDto } from '../dto/get-service-maintenance-list-query.dto';
import { accountGroupHasTag, ServiceRevenueAccountGroupTag } from '../utils/service-maintenance-account.util';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
import { ensureModuleAction } from '../../../../common/utils/module-permissions.util';
const ServicesMaintenanceModuleCode = 'SM';

@Injectable()
export class ServicesLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: Pick<GetServiceMaintenanceListQueryDto, 'search' | 'serviceType'>) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      services: await this.findOptions({
        companyId,
        search: query.search,
        serviceType: query.serviceType,
      }),
    };
  }

  async findAccountOptionsForCompanyUser(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, ServicesMaintenanceModuleCode, PermissionAction.VIEW, 'You do not have permission to manage service records.');

    return {
      accounts: await this.findAccountOptions({ companyId }),
    };
  }

  async findOptions({ companyId, search, serviceType }: { companyId: number; search?: string; serviceType?: ServiceMaintenanceType }) {
    const normalizedSearch = search?.trim();
    const services = await this.prisma.serviceMaintenance.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
        ...(serviceType ? { serviceType } : {}),
        ...(normalizedSearch ? { serviceName: { contains: normalizedSearch, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        serviceName: true,
        serviceType: true,
        status: true,
      },
      orderBy: [{ serviceName: 'asc' }, { id: 'asc' }],
    });

    return services.map((service) => ({
      id: service.id.toString(),
      serviceName: service.serviceName,
      name: service.serviceName,
      serviceType: service.serviceType,
      status: service.status,
    }));
  }

  async findAccountOptions({ companyId }: { companyId: number }) {
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
}
