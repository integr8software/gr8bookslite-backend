import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionAction } from '../../enums/permission-action.enum';
import type {
  EnabledModuleRecord,
  EntitledModuleRecord,
  PlanModuleEntitlementSource,
} from './entitlement.types';

export const UsableCompanySubscriptionStatuses = [
  SubscriptionStatus.INCOMPLETE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.UNPAID,
];

const CompanyPlanModulesInclude = {
  plan: {
    include: {
      systems: {
        where: { isEnabled: true, system: { isActive: true } },
        include: {
          system: {
            include: {
              modules: {
                where: {
                  isActive: true,
                  module: { isActive: true },
                },
                include: {
                  module: {
                    include: {
                      permissions: {
                        where: { isActive: true },
                        orderBy: { id: 'asc' as const },
                      },
                    },
                  },
                },
                orderBy: [
                  { sortOrder: 'asc' as const },
                  { id: 'asc' as const },
                ],
              },
            },
          },
        },
        orderBy: [{ system: { sortOrder: 'asc' as const } }],
      },
    },
  },
} satisfies Prisma.CompanySubscriptionInclude;

const CompanyPlanSidebarInclude = {
  plan: {
    include: {
      systems: {
        where: { isEnabled: true, system: { isActive: true } },
        include: {
          system: {
            include: {
              sidebarItems: {
                where: { isVisible: true },
                include: { module: true },
                orderBy: [
                  { sortOrder: 'asc' as const },
                  { id: 'asc' as const },
                ],
              },
            },
          },
        },
        orderBy: [{ system: { sortOrder: 'asc' as const } }],
      },
    },
  },
} satisfies Prisma.CompanySubscriptionInclude;

type EntitlementQueryClient = Pick<
  Prisma.TransactionClient,
  'companySubscription'
>;

type CompanyPlanModuleSubscription = Prisma.CompanySubscriptionGetPayload<{
  include: typeof CompanyPlanModulesInclude;
}>;

export type CompanyPlanModule =
  CompanyPlanModuleSubscription['plan']['systems'][number]['system']['modules'][number]['module'];

type CompanyPlanSidebarSubscription = Prisma.CompanySubscriptionGetPayload<{
  include: typeof CompanyPlanSidebarInclude;
}>;

export type CompanyPlanSidebarItem =
  CompanyPlanSidebarSubscription['plan']['systems'][number]['system']['sidebarItems'][number] & {
    systemCode: string;
  };

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma?: PrismaService) {}

  static usableCompanySubscriptionStatuses(): SubscriptionStatus[] {
    return UsableCompanySubscriptionStatuses;
  }

  static companyPlanSidebarInclude(): typeof CompanyPlanSidebarInclude {
    return CompanyPlanSidebarInclude;
  }

  getEnabledModuleCodes(source: PlanModuleEntitlementSource): string[] {
    return this.getEnabledModules(source).map((item) => item.module.code);
  }

  getEnabledModuleIds(source: PlanModuleEntitlementSource): Set<number> {
    return new Set(this.getEnabledModules(source).map((item) => item.moduleId));
  }

  getEnabledModules<TEnabledModule extends EntitledModuleRecord>(
    source: PlanModuleEntitlementSource<TEnabledModule>,
  ): TEnabledModule[] {
    const planModules = this.getLatestSubscriptionPlanModules(source);

    return this.dedupeModules(planModules);
  }

  getPermittedEnabledModules<TEnabledModule extends EntitledModuleRecord>(
    enabledModules: TEnabledModule[],
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): TEnabledModule[] {
    return enabledModules.filter((item) =>
      this.hasModulePermission(
        item.module,
        permissionSet,
        hasAdminModuleAccess,
      ),
    );
  }

  hasModulePermission(
    module: EnabledModuleRecord,
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): boolean {
    return (
      hasAdminModuleAccess ||
      module.permissions.some((permission) =>
        Object.values(PermissionAction).some((action) =>
          permissionSet.has(this.buildPermissionKey(permission.code, action)),
        ),
      )
    );
  }

  async getCompanyAllowedModuleIds(
    companyId: number,
    client?: EntitlementQueryClient,
  ): Promise<Set<number>> {
    return EntitlementService.getCompanyAllowedModuleIds(
      this.getQueryClient(client),
      companyId,
    );
  }

  async getCompanyAllowedModules(
    companyId: number,
    client?: EntitlementQueryClient,
  ): Promise<CompanyPlanModule[]> {
    return EntitlementService.getCompanyAllowedModules(
      this.getQueryClient(client),
      companyId,
    );
  }

  async getCompanyPlanSidebarItems(
    companyId: number,
    permittedModuleIds: Set<number>,
    client?: EntitlementQueryClient,
  ): Promise<CompanyPlanSidebarItem[]> {
    return EntitlementService.getCompanyPlanSidebarItems(
      this.getQueryClient(client),
      companyId,
      permittedModuleIds,
    );
  }

  static async getCompanyAllowedModuleIds(
    client: EntitlementQueryClient,
    companyId: number,
  ): Promise<Set<number>> {
    const rows = await this.getLatestCompanyPlanModuleRows(client, companyId);

    return new Set(rows.map((row) => row.moduleId));
  }

  static async getCompanyAllowedModules(
    client: EntitlementQueryClient,
    companyId: number,
  ): Promise<CompanyPlanModule[]> {
    const rows = await this.getLatestCompanyPlanModuleRows(client, companyId);
    const modulesById = new Map<number, CompanyPlanModule>();

    for (const row of rows) {
      if (!modulesById.has(row.module.id)) {
        modulesById.set(row.module.id, row.module);
      }
    }

    return [...modulesById.values()];
  }

  static async getCompanyPlanSidebarItems(
    client: EntitlementQueryClient,
    companyId: number,
    permittedModuleIds: Set<number>,
  ): Promise<CompanyPlanSidebarItem[]> {
    const subscription = await client.companySubscription.findFirst({
      where: {
        companyId,
        status: {
          in: UsableCompanySubscriptionStatuses,
        },
      },
      include: CompanyPlanSidebarInclude,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    const items: CompanyPlanSidebarItem[] = [];

    for (const planSystem of subscription?.plan.systems ?? []) {
      for (const item of planSystem.system.sidebarItems) {
        if (
          item.itemType === 'LINK' &&
          (!item.moduleId || !permittedModuleIds.has(item.moduleId))
        ) {
          continue;
        }
        items.push({ ...item, systemCode: planSystem.system.code });
      }
    }

    return items;
  }

  private buildPermissionKey(
    permissionCode: string,
    action: PermissionAction,
  ): string {
    return `${permissionCode}:${action}`;
  }

  private getQueryClient(client?: EntitlementQueryClient) {
    const queryClient = client ?? this.prisma;

    if (!queryClient) {
      throw new Error('EntitlementService requires PrismaService.');
    }

    return queryClient;
  }

  private static async getLatestCompanyPlanModuleRows(
    client: EntitlementQueryClient,
    companyId: number,
  ) {
    const subscription = await client.companySubscription.findFirst({
      where: {
        companyId,
        status: {
          in: UsableCompanySubscriptionStatuses,
        },
      },
      include: CompanyPlanModulesInclude,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    return (
      subscription?.plan.systems.flatMap(
        (planSystem) => planSystem.system.modules,
      ) ?? []
    );
  }

  private getLatestSubscriptionPlanModules<
    TEnabledModule extends EntitledModuleRecord,
  >(source: PlanModuleEntitlementSource<TEnabledModule>): TEnabledModule[] {
    const subscription = source.company.subscriptions?.[0];

    if (!subscription) {
      return [];
    }

    return subscription.plan.systems.flatMap((planSystem) =>
      (planSystem.system.modules ?? []).filter((item) =>
        this.isEnabledModuleUsable(item),
      ),
    );
  }

  private dedupeModules<TEnabledModule extends EntitledModuleRecord>(
    modules: TEnabledModule[],
  ): TEnabledModule[] {
    const byModuleId = new Map<number, TEnabledModule>();

    for (const module of modules) {
      if (!byModuleId.has(module.moduleId)) {
        byModuleId.set(module.moduleId, module);
      }
    }

    return [...byModuleId.values()];
  }

  private isEnabledModuleUsable(module: EntitledModuleRecord): boolean {
    return module.module.isActive !== false;
  }
}
